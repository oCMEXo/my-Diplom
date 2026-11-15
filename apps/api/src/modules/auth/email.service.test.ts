import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { testOutbox } from "../../lib/mailer.js";
import { loginAsGuest, loginUser, refreshSession, registerUser, upgradeGuest } from "./auth.service.js";
import { requestPasswordReset, resendVerification, resetPassword, verifyEmail } from "./email.service.js";

const userIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

function linkFor(email: string, path: string) {
  const mail = [...testOutbox].reverse().find((item) => item.to === email && item.text.includes(path));
  const match = mail?.text.match(new RegExp(`${path}\\?token=([\\w-]+)`));
  return match?.[1] ?? null;
}

async function register() {
  const email = `${randomUUID()}@example.com`;
  const result = await registerUser({ email, name: "Anna", password: "password123" });
  userIds.push(result.user.id);
  return { email, ...result };
}

describe("email verification", () => {
  it("sends a link on sign-up, and the link confirms the address once", async () => {
    const { email, user } = await register();
    expect(user.emailVerified).toBe(false);

    const token = linkFor(email, "/verify-email");
    expect(token).not.toBeNull();
    const verified = await verifyEmail(token!);
    expect(verified.emailVerifiedAt).not.toBeNull();
    await expect(verifyEmail(token!)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("does not send a second email within a minute, and nothing to a confirmed address", async () => {
    const { email, user } = await register();
    const before = testOutbox.filter((mail) => mail.to === email).length;
    await resendVerification(user.id);
    expect(testOutbox.filter((mail) => mail.to === email).length).toBe(before);

    await verifyEmail(linkFor(email, "/verify-email")!);
    await prisma.emailToken.deleteMany({ where: { userId: user.id } });
    await resendVerification(user.id);
    expect(testOutbox.filter((mail) => mail.to === email).length).toBe(before);
  });

  it("sends a link when a guest saves the account, and refuses to confirm a guest", async () => {
    const guest = await loginAsGuest({ name: "Guest" });
    userIds.push(guest.user.id);
    await expect(resendVerification(guest.user.id)).rejects.toMatchObject({ statusCode: 400 });

    const email = `${randomUUID()}@example.com`;
    await upgradeGuest(guest.user.id, { email, password: "password123" });
    expect(linkFor(email, "/verify-email")).not.toBeNull();
  });
});

describe("password reset", () => {
  it("sets a new password, signs out everywhere and works only once", async () => {
    const { email, tokens } = await register();
    await requestPasswordReset(email);
    const token = linkFor(email, "/reset-password");
    expect(token).not.toBeNull();

    await resetPassword({ token: token!, password: "new-password-1" });
    await expect(loginUser({ email, password: "password123" })).rejects.toMatchObject({ statusCode: 401 });
    const signedIn = await loginUser({ email, password: "new-password-1" });
    expect(signedIn.user.emailVerified).toBe(true);
    await expect(refreshSession(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await expect(resetPassword({ token: token!, password: "another-password" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("answers the same for unknown addresses and guests, and sends nothing", async () => {
    const before = testOutbox.length;
    await requestPasswordReset(`${randomUUID()}@example.com`);
    const guest = await loginAsGuest({ name: "Guest" });
    userIds.push(guest.user.id);
    await requestPasswordReset(guest.user.email);
    expect(testOutbox.length).toBe(before);
  });

  it("refuses an expired link and a link of the other kind", async () => {
    const { email, user } = await register();
    const verifyToken = linkFor(email, "/verify-email")!;
    await expect(resetPassword({ token: verifyToken, password: "new-password-1" })).rejects.toMatchObject({ statusCode: 400 });

    await requestPasswordReset(email);
    const token = linkFor(email, "/reset-password")!;
    await prisma.emailToken.updateMany({ where: { userId: user.id, kind: "reset" }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword({ token, password: "new-password-1" })).rejects.toMatchObject({ statusCode: 400 });
  });
});
