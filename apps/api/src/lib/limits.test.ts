import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { checkFileLimit, checkProjectLimit, filesRoomLeft, takeRunSlot } from "./limits.js";

const userIds: string[] = [];
afterAll(async () => {
  await prisma.project.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function owner() {
  const user = await prisma.user.create({
    data: { email: `${randomUUID()}@test.local`, name: "Owner", passwordHash: "not-a-real-hash" },
  });
  userIds.push(user.id);
  return user;
}

async function project(ownerId: string) {
  return prisma.project.create({ data: { name: "Limits", ownerId, inviteCode: randomUUID() } });
}

describe("limits", () => {
  it("stops a person at the project limit", async () => {
    const user = await owner();
    await project(user.id);
    await expect(checkProjectLimit(user.id, 2)).resolves.toBeUndefined();
    await project(user.id);
    await expect(checkProjectLimit(user.id, 2)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("counts the files of a project, trash included", async () => {
    const user = await owner();
    const p = await project(user.id);
    await prisma.file.create({ data: { projectId: p.id, path: "a.py" } });
    await prisma.file.create({ data: { projectId: p.id, path: ".trash/x/b.py", deletedAt: new Date() } });
    expect(await filesRoomLeft(p.id, 5)).toBe(3);
    await expect(checkFileLimit(p.id, 2)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows a number of runs per minute and frees the slots after it", () => {
    const userId = randomUUID();
    const start = 1_000_000;
    takeRunSlot(userId, 2, start);
    takeRunSlot(userId, 2, start + 1000);
    expect(() => takeRunSlot(userId, 2, start + 2000)).toThrow(/Wait 58 s/);
    expect(() => takeRunSlot(userId, 2, start + 60_001)).not.toThrow();
  });
});
