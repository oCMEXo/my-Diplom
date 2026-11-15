import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { notePresence, purgeOldUsage, recordActive, recordUsage, usageStats, usageWritten } from "./usage.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const userIds: string[] = [];
afterAll(async () => {
  await prisma.project.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function user() {
  const created = await prisma.user.create({
    data: { email: `${randomUUID()}@test.local`, name: "Usage", passwordHash: "not-a-real-hash" },
  });
  userIds.push(created.id);
  return created;
}

describe("usage statistics", () => {
  it("records one shared session when the second person arrives, not on every change", async () => {
    const projectId = randomUUID();
    notePresence(projectId, 1);
    notePresence(projectId, 2);
    notePresence(projectId, 3);
    notePresence(projectId, 2);
    notePresence(projectId, 1);
    notePresence(projectId, 2);
    await usageWritten();
    expect(await prisma.usageEvent.count({ where: { kind: "shared_session", projectId } })).toBe(2);
    await prisma.usageEvent.deleteMany({ where: { projectId } });
  });

  it("counts a person as active once a day", async () => {
    const person = await user();
    const day = new Date("2031-01-05T10:00:00Z");
    recordActive(person.id, day);
    recordActive(person.id, new Date(day.getTime() + 60_000));
    recordActive(person.id, new Date(day.getTime() + DAY_MS));
    await usageWritten();
    expect(await prisma.usageEvent.count({ where: { kind: "active_day", userId: person.id } })).toBe(2);
  });

  it("finds returning people and the time to the first shared session", async () => {
    const now = new Date();
    const back = await user();
    const once = await user();
    const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS);
    await prisma.usageEvent.createMany({
      data: [
        { kind: "active_day", userId: back.id, createdAt: at(10) },
        { kind: "active_day", userId: back.id, createdAt: at(2) },
        { kind: "active_day", userId: once.id, createdAt: at(1) },
      ],
    });
    const project = await prisma.project.create({
      data: { name: "Stats", ownerId: back.id, inviteCode: randomUUID(), createdAt: at(1) },
    });
    await prisma.usageEvent.create({
      data: { kind: "shared_session", projectId: project.id, createdAt: new Date(project.createdAt.getTime() + 90_000) },
    });

    const stats = await usageStats(now);
    expect(stats.activeUsers).toBeGreaterThanOrEqual(2);
    expect(stats.returningUsers).toBeGreaterThanOrEqual(1);
    expect(stats.sharedProjects30d).toBeGreaterThanOrEqual(1);
    expect(stats.medianMinutesToSharedSession).not.toBeNull();
    await prisma.usageEvent.deleteMany({ where: { projectId: project.id } });
  });

  it("deletes events older than the retention period, and an account's events with it", async () => {
    const person = await user();
    await prisma.usageEvent.create({ data: { kind: "run_started", userId: person.id, createdAt: new Date(Date.now() - 200 * DAY_MS) } });
    recordUsage("run_started", { userId: person.id });
    await usageWritten();
    await purgeOldUsage();
    expect(await prisma.usageEvent.count({ where: { userId: person.id } })).toBe(1);

    await prisma.user.delete({ where: { id: person.id } });
    expect(await prisma.usageEvent.count({ where: { userId: person.id } })).toBe(0);
  });
});
