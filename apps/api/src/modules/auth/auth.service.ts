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

interface UserLike {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
}

function toAuthUser(user: UserLike) {
  return { id: user.id, email: user.email, name: user.name, isGuest: user.isGuest };
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
    throw new AppError("Этот email уже зарегистрирован", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash },
  });

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new AppError("Неверный email или пароль", 401);
  }

  const tokens = await issueTokens(user);
  return { user: toAuthUser(user), tokens };
}

export async function loginAsGuest(input: GuestLoginInput) {
  const passwordHash = await hashPassword(randomUUID());
  const user = await prisma.user.create({
    data: {
      email: `guest-${randomUUID()}@guest.local`,
      // Without a number every nameless guest would look the same on the cursors and in the chat.
      name: input.name?.trim() || `Гость ${randomInt(1000, 10000)}`,
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
    throw new AppError("Сессия истекла. Войдите снова.", 401);
  }

  // Two tabs can present the same token at once: only one of them gets a new one.
  const { count } = await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
  if (count === 0) throw new AppError("Сессия истекла. Войдите снова.", 401);

  const tokens = await issueTokens(stored.user);
  return { user: toAuthUser(stored.user), tokens };
}

/** A guest keeps the account, and with it the projects and the chat history, by adding a login. */
export async function upgradeGuest(userId: string, input: UpgradeGuestInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isGuest) throw new AppError("Это уже постоянный аккаунт", 400);

  const taken = await prisma.user.findUnique({ where: { email: input.email } });
  if (taken) throw new AppError("Этот email уже зарегистрирован", 409);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: input.email, passwordHash: await hashPassword(input.password), isGuest: false },
  });
  return toAuthUser(updated);
}

/**
 * The right to erasure: the account, its own messages and the projects it owns go for good. Files
 * history stays anonymous in other people's projects (the author is set to null by the database).
 */
export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isGuest && !(input.password && (await verifyPassword(user.passwordHash, input.password)))) {
    throw new AppError("Неверный пароль", 403);
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

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
