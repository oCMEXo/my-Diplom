import { randomInt, randomUUID } from "node:crypto";
import { prisma } from "@collab/db";
import { REFRESH_TOKEN_TTL_SECONDS } from "@collab/shared";
import type {
  DeleteAccountInput,
  GuestLoginInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UpgradeGuestInput,
} from "@collab/shared";
import { announceAccessChange } from "../../lib/access-changes.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signAccessToken } from "../../lib/jwt.js";
import { generateRefreshToken, hashRefreshToken } from "../../lib/refresh-token.js";
import { AppError } from "../../lib/errors.js";
import { env } from "../../env.js";
import { sendVerificationEmail } from "./email.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

interface UserLike {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  emailVerifiedAt: Date | null;
}

export function toAuthUser(user: UserLike) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isGuest: user.isGuest,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

async function issueTokens(user: { id: string; email: string }) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("This email is already registered", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash },
  });

  await sendVerificationEmail(user);
  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
}

let decoyHash: Promise<string> | null = null;

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same timing for unknown emails and wrong passwords, so accounts can't be probed.
  decoyHash ??= hashPassword(randomUUID());
  const valid = await verifyPassword(user?.passwordHash ?? (await decoyHash), input.password);
  if (!user || !valid) {
    throw new AppError("Wrong email or password", 401);
  }

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
}

export async function loginAsGuest(input: GuestLoginInput) {
  const passwordHash = await hashPassword(randomUUID());
  const user = await prisma.user.create({
    data: {
      email: `guest-${randomUUID()}@guest.local`,
      // Random number, so nameless guests can be told apart.
      name: input.name?.trim() || `Guest ${randomInt(1000, 10000)}`,
      passwordHash,
      isGuest: true,
    },
  });

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({ where: { id: userId }, data: { name: input.name.trim() } });
  return toAuthUser(user);
}

export async function refreshSession(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError("Your session has expired. Please sign in again.", 401);
  }

  // Two tabs may refresh with the same token at once; only one of them wins.
  const { count } = await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
  if (count === 0) throw new AppError("Your session has expired. Please sign in again.", 401);

  const tokens = await issueTokens(stored.user);
  return { user: toAuthUser(stored.user), tokens };
}

export async function upgradeGuest(userId: string, input: UpgradeGuestInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isGuest) throw new AppError("This is already a full account", 400);

  const taken = await prisma.user.findUnique({ where: { email: input.email } });
  if (taken) throw new AppError("This email is already registered", 409);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: input.email, passwordHash: await hashPassword(input.password), isGuest: false },
  });
  await sendVerificationEmail(updated);
  return toAuthUser(updated);
}

/** GDPR erasure: deletes the account, its messages and owned projects. Its file versions in other projects stay (author set to null). */
export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isGuest && !(input.password && (await verifyPassword(user.passwordHash, input.password)))) {
    throw new AppError("Wrong password", 403);
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true },
  });

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { authorId: userId } }),
    prisma.project.deleteMany({ where: { ownerId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  for (const { projectId, role } of memberships) {
    await announceAccessChange(
      role === "owner" ? { projectId, reason: "deleted" } : { projectId, userId, reason: "left" },
    );
  }
}

/** Deletes guests older than `days` with no project and no live session, with their messages. Returns the count. */
export async function purgeStaleGuests(now = new Date(), days = env.GUEST_RETENTION_DAYS, batchSize = 200) {
  const unused = {
    isGuest: true,
    createdAt: { lt: new Date(now.getTime() - days * DAY_MS) },
    memberships: { none: {} },
    ownedProjects: { none: {} },
    refreshTokens: { none: { expiresAt: { gt: now } } },
  };
  let purged = 0;
  for (;;) {
    const batch = await prisma.user.findMany({ where: unused, select: { id: true }, take: batchSize });
    if (batch.length === 0) return purged;
    const ids = batch.map((user) => user.id);
    // Conditions repeated in case the guest joined a project in between.
    const [, { count }] = await prisma.$transaction([
      prisma.message.deleteMany({ where: { authorId: { in: ids }, author: unused } }),
      prisma.user.deleteMany({ where: { id: { in: ids }, ...unused } }),
    ]);
    purged += count;
    if (batch.length < batchSize) return purged;
  }
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
