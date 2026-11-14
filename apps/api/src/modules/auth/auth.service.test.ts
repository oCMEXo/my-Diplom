import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { verifyAccessToken } from "../../lib/jwt.js";
import { createProject, getProject, inviteMember } from "../projects/projects.service.js";
import { createMessage } from "../messages/messages.service.js";
import {
  deleteAccount,
  loginAsGuest,
  loginUser,
  purgeStaleGuests,
  refreshSession,
  registerUser,
  upgradeGuest,
} from "./auth.service.js";

describe("loginUser", () => {
  it("takes about as long for an unknown address as for a wrong password", { timeout: 30_000 }, async () => {
    const email = `${randomUUID()}@example.com`;
    const { user } = await registerUser({ email, name: "Аня", password: "password123" });
    const fastest = async (attempt: () => Promise<unknown>) => {
      let best = Infinity;
      for (let run = 0; run < 3; run += 1) {
        const started = performance.now();
        await attempt().catch(() => undefined);
        best = Math.min(best, performance.now() - started);
      }
      return best;
    };

    const wrongPassword = await fastest(() => loginUser({ email, password: "wrong-password" }));
    const unknownAddress = await fastest(() => loginUser({ email: `${randomUUID()}@example.com`, password: "wrong-password" }));
    await prisma.user.delete({ where: { id: user.id } });

    expect(unknownAddress).toBeGreaterThan(wrongPassword / 3);
  });
});

describe("loginAsGuest", () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("creates a usable guest account without email/password", async () => {
    const result = await loginAsGuest({ name: "Казимир" });
    createdUserIds.push(result.user.id);

    expect(result.user.isGuest).toBe(true);
    expect(result.user.name).toBe("Казимир");

    const payload = verifyAccessToken(result.tokens.accessToken);
    expect(payload.sub).toBe(result.user.id);
  });

  it("falls back to a default name when none is given", async () => {
    const result = await loginAsGuest({});
    createdUserIds.push(result.user.id);

    expect(result.user.name).toBeTruthy();
  });

  it("gives each guest a distinct account", async () => {
    const a = await loginAsGuest({ name: "A" });
    const b = await loginAsGuest({ name: "B" });
    createdUserIds.push(a.user.id, b.user.id);

    expect(a.user.id).not.toBe(b.user.id);
    expect(a.user.email).not.toBe(b.user.email);
  });
});

describe("purgeStaleGuests", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const userIds: string[] = [];
  const projectIds: string[] = [];

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.message.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  /** A guest whose account is `days` old; the session ended unless `liveSession` is set. */
  async function guestFrom(days: number, { liveSession = false } = {}) {
    const { user } = await loginAsGuest({ name: "Гость" });
    userIds.push(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { createdAt: new Date(Date.now() - days * DAY_MS) } });
    if (!liveSession) {
      await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - DAY_MS) } });
    }
    return user;
  }

  const exists = async (id: string) => (await prisma.user.findUnique({ where: { id } })) !== null;

  it("deletes an old guest who is in no project, with the messages", async () => {
    const owner = await registerUser({ email: `${randomUUID()}@example.com`, name: "Аня", password: "password123" });
    userIds.push(owner.user.id);
    const project = await createProject(owner.user.id, { name: "Проект" });
    projectIds.push(project.id);
    const guest = await guestFrom(45);
    // The guest wrote in the chat and was then removed from the project.
    await prisma.projectMember.create({ data: { projectId: project.id, userId: guest.id, role: "editor" } });
    const message = await createMessage(guest.id, project.id, { body: "привет" });
    await prisma.projectMember.delete({ where: { projectId_userId: { projectId: project.id, userId: guest.id } } });

    expect(await purgeStaleGuests()).toBeGreaterThanOrEqual(1);

    expect(await exists(guest.id)).toBe(false);
    expect(await prisma.message.findUnique({ where: { id: message.id } })).toBeNull();
    expect(await exists(owner.user.id)).toBe(true);
  });

  it("keeps a guest who is new, is in a project or still has a session", async () => {
    const owner = await registerUser({ email: `${randomUUID()}@example.com`, name: "Аня", password: "password123" });
    userIds.push(owner.user.id);
    const project = await createProject(owner.user.id, { name: "Проект" });
    projectIds.push(project.id);
    const fresh = await guestFrom(5);
    const member = await guestFrom(45);
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id, role: "viewer" } });
    const signedIn = await guestFrom(45, { liveSession: true });

    await purgeStaleGuests();

    expect(await exists(fresh.id)).toBe(true);
    expect(await exists(member.id)).toBe(true);
    expect(await exists(signedIn.id)).toBe(true);
  });

  it("never deletes a registered account", async () => {
    const old = await registerUser({ email: `${randomUUID()}@example.com`, name: "Старый", password: "password123" });
    userIds.push(old.user.id);
    await prisma.user.update({ where: { id: old.user.id }, data: { createdAt: new Date(Date.now() - 400 * DAY_MS) } });
    await prisma.refreshToken.deleteMany({ where: { userId: old.user.id } });

    await purgeStaleGuests();

    expect(await exists(old.user.id)).toBe(true);
  });
});

describe("keeping and closing an account", () => {
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const email = () => `${randomUUID()}@test.local`;

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("turns a guest into a registered user who keeps the same account and projects", async () => {
    const guest = await loginAsGuest({ name: "Гость" });
    userIds.push(guest.user.id);
    const project = await createProject(guest.user.id, { name: "Работа гостя" });
    projectIds.push(project.id);
    const address = email();

    const upgraded = await upgradeGuest(guest.user.id, { email: address, password: "password123" });

    expect(upgraded).toMatchObject({ id: guest.user.id, email: address, isGuest: false });
    const signedIn = await loginUser({ email: address, password: "password123" });
    expect(signedIn.user.id).toBe(guest.user.id);
    await expect(getProject(signedIn.user.id, project.id)).resolves.toMatchObject({ myRole: "owner" });
  });

  it("refuses an address that is taken, and an account that is not a guest", async () => {
    const existing = await registerUser({ email: email(), password: "password123", name: "Есть" });
    const guest = await loginAsGuest({ name: "Гость" });
    userIds.push(existing.user.id, guest.user.id);

    await expect(upgradeGuest(guest.user.id, { email: existing.user.email, password: "password123" })).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(upgradeGuest(existing.user.id, { email: email(), password: "password123" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("deletes the account, its messages and its projects, but not other people's projects", async () => {
    const leaving = await registerUser({ email: email(), password: "password123", name: "Ухожу" });
    const staying = await registerUser({ email: email(), password: "password123", name: "Остаюсь" });
    userIds.push(leaving.user.id, staying.user.id);
    const own = await createProject(leaving.user.id, { name: "Мой" });
    const shared = await createProject(staying.user.id, { name: "Чужой" });
    projectIds.push(own.id, shared.id);
    await inviteMember(staying.user.id, shared.id, { email: leaving.user.email, role: "editor" });
    await createMessage(leaving.user.id, shared.id, { body: "моё сообщение" });
    await createMessage(staying.user.id, shared.id, { body: "чужое сообщение" });

    await deleteAccount(leaving.user.id, { password: "password123" });

    expect(await prisma.user.findUnique({ where: { id: leaving.user.id } })).toBeNull();
    expect(await prisma.project.findUnique({ where: { id: own.id } })).toBeNull();
    const left = await getProject(staying.user.id, shared.id);
    expect(left.members.map((member) => member.userId)).toEqual([staying.user.id]);
    const messages = await prisma.message.findMany({ where: { projectId: shared.id } });
    expect(messages.map((message) => message.body)).toEqual(["чужое сообщение"]);
    await expect(loginUser({ email: leaving.user.email, password: "password123" })).rejects.toMatchObject({ statusCode: 401 });
  });

  it("asks a registered user for the password, but not a guest who has none", async () => {
    const user = await registerUser({ email: email(), password: "password123", name: "Пароль" });
    const guest = await loginAsGuest({ name: "Гость" });
    userIds.push(user.user.id, guest.user.id);

    await expect(deleteAccount(user.user.id, { password: "wrong-password" })).rejects.toMatchObject({ statusCode: 403 });
    await expect(deleteAccount(user.user.id, {})).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.user.findUnique({ where: { id: user.user.id } })).not.toBeNull();

    await deleteAccount(guest.user.id, {});
    expect(await prisma.user.findUnique({ where: { id: guest.user.id } })).toBeNull();
  });

  it("gives a new token only to the first of two tabs presenting the same one", async () => {
    const user = await registerUser({ email: email(), password: "password123", name: "Вкладки" });
    userIds.push(user.user.id);

    const results = await Promise.allSettled([
      refreshSession(user.tokens.refreshToken),
      refreshSession(user.tokens.refreshToken),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ statusCode: 401 });
  });
});
