import { prisma } from "@collab/db";
import type { ResetPasswordInput } from "@collab/shared";
import { env } from "../../env.js";
import { AppError } from "../../lib/errors.js";
import { sendMail } from "../../lib/mailer.js";
import { hashPassword } from "../../lib/password.js";
import { generateRefreshToken, hashRefreshToken } from "../../lib/refresh-token.js";

type Kind = "verify" | "reset";

const LIFETIME_MS: Record<Kind, number> = { verify: 3 * 24 * 60 * 60 * 1000, reset: 60 * 60 * 1000 };
const RESEND_GAP_MS = 60 * 1000;

const BAD_LINK = "This link is not valid or has expired. Ask for a new one.";

async function createToken(userId: string, kind: Kind) {
  const recent = await prisma.emailToken.findFirst({
    where: { userId, kind, createdAt: { gt: new Date(Date.now() - RESEND_GAP_MS) } },
  });
  if (recent) return null;
  const token = generateRefreshToken();
  await prisma.$transaction([
    prisma.emailToken.deleteMany({ where: { userId, kind } }),
    prisma.emailToken.create({
      data: { userId, kind, tokenHash: hashRefreshToken(token), expiresAt: new Date(Date.now() + LIFETIME_MS[kind]) },
    }),
  ]);
  return token;
}

async function useToken(token: string, kind: Kind) {
  const stored = await prisma.emailToken.findUnique({ where: { tokenHash: hashRefreshToken(token) } });
  if (!stored || stored.kind !== kind) throw new AppError(BAD_LINK, 400);
  const { count } = await prisma.emailToken.deleteMany({ where: { id: stored.id } });
  if (count === 0 || stored.expiresAt < new Date()) throw new AppError(BAD_LINK, 400);
  return stored.userId;
}

export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = await createToken(user.id, "verify");
  if (!token) return;
  await sendMail({
    to: user.email,
    subject: "Confirm your email for Collab",
    text: [
      `Hi ${user.name},`,
      "",
      "Please confirm your email address by opening this link:",
      `${env.APP_URL}/verify-email?token=${token}`,
      "",
      "The link works for 3 days. If you did not create an account, you can ignore this email.",
    ].join("\n"),
  });
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.isGuest) throw new AppError("A guest has no email to confirm", 400);
  if (user.emailVerifiedAt) return;
  await sendVerificationEmail(user);
}

export async function verifyEmail(token: string) {
  const userId = await useToken(token, "verify");
  return prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isGuest) return;
  const token = await createToken(user.id, "reset");
  if (!token) return;
  await sendMail({
    to: user.email,
    subject: "Reset your Collab password",
    text: [
      `Hi ${user.name},`,
      "",
      "Someone asked to reset the password of your Collab account. To choose a new one, open this link:",
      `${env.APP_URL}/reset-password?token=${token}`,
      "",
      "The link works for 1 hour. If it was not you, ignore this email: your password stays the same.",
    ].join("\n"),
  });
}

export async function resetPassword(input: ResetPasswordInput) {
  const userId = await useToken(input.token, "reset");
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: new Date() } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.emailToken.deleteMany({ where: { userId, kind: "reset" } }),
  ]);
}
