import { prisma } from "@collab/db";

export type UsageKind = "active_day" | "project_created" | "shared_session" | "run_started" | "class_joined";

export const USAGE_RETENTION_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

const pending = new Set<Promise<unknown>>();

export function recordUsage(kind: UsageKind, ids: { userId?: string; projectId?: string } = {}) {
  const write = prisma.usageEvent
    .create({ data: { kind, userId: ids.userId ?? null, projectId: ids.projectId ?? null } })
    .catch(() => undefined)
    .finally(() => pending.delete(write));
  pending.add(write);
}

export async function usageWritten() {
  await Promise.all([...pending]);
}

const activeToday = new Set<string>();
let activeDay = "";

export function recordActive(userId: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  if (day !== activeDay) {
    activeDay = day;
    activeToday.clear();
  }
  if (activeToday.has(userId)) return;
  activeToday.add(userId);
  recordUsage("active_day", { userId });
}

const lastCount = new Map<string, number>();

export function notePresence(projectId: string, people: number) {
  const before = lastCount.get(projectId) ?? 0;
  if (people === 0) lastCount.delete(projectId);
  else lastCount.set(projectId, people);
  if (before < 2 && people >= 2) recordUsage("shared_session", { projectId });
}

export async function purgeOldUsage(now = new Date()) {
  const { count } = await prisma.usageEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - USAGE_RETENTION_DAYS * DAY_MS) } },
  });
  return count;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export async function usageStats(now = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

  const activeUsers = async (from: Date, to: Date) =>
    new Set(
      (
        await prisma.usageEvent.findMany({
          where: { kind: "active_day", createdAt: { gte: from, lt: to }, userId: { not: null } },
          select: { userId: true },
        })
      ).map((event) => event.userId!),
    );
  const thisWeek = await activeUsers(weekAgo, now);
  const lastWeek = await activeUsers(twoWeeksAgo, weekAgo);
  const count = (kind: UsageKind) => prisma.usageEvent.count({ where: { kind, createdAt: { gte: weekAgo, lt: now } } });

  const projects = await prisma.project.findMany({
    where: { createdAt: { gte: monthAgo, lt: now } },
    select: { id: true, createdAt: true },
  });
  const firstShared = await prisma.usageEvent.groupBy({
    by: ["projectId"],
    where: { kind: "shared_session", projectId: { in: projects.map((project) => project.id) } },
    _min: { createdAt: true },
  });
  const createdAt = new Map(projects.map((project) => [project.id, project.createdAt.getTime()]));
  const minutes = firstShared
    .filter((row) => row.projectId && row._min.createdAt)
    .map((row) => (row._min.createdAt!.getTime() - createdAt.get(row.projectId!)!) / 60_000);

  return {
    activeUsers: thisWeek.size,
    returningUsers: [...thisWeek].filter((id) => lastWeek.has(id)).length,
    activeLastWeek: lastWeek.size,
    newAccounts: await prisma.user.count({ where: { createdAt: { gte: weekAgo, lt: now }, isGuest: false } }),
    newGuests: await prisma.user.count({ where: { createdAt: { gte: weekAgo, lt: now }, isGuest: true } }),
    projectsCreated: await count("project_created"),
    sharedSessions: await count("shared_session"),
    runs: await count("run_started"),
    classJoins: await count("class_joined"),
    newProjects30d: projects.length,
    sharedProjects30d: minutes.length,
    medianMinutesToSharedSession: median(minutes),
  };
}
