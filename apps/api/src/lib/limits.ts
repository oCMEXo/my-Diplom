import { prisma } from "@collab/db";
import { env } from "../env.js";
import { AppError } from "./errors.js";

export async function checkProjectLimit(userId: string, max = env.MAX_PROJECTS_PER_USER) {
  const owned = await prisma.project.count({ where: { ownerId: userId } });
  if (owned >= max) {
    throw new AppError(`You have reached the limit of ${max} projects. Delete an old project to make room.`, 403);
  }
}

/** How many more files the project can take (files in the trash count too: they can come back). */
export async function filesRoomLeft(projectId: string, max = env.MAX_FILES_PER_PROJECT) {
  const count = await prisma.file.count({ where: { projectId } });
  return Math.max(0, max - count);
}

export async function checkFileLimit(projectId: string, max = env.MAX_FILES_PER_PROJECT) {
  if ((await filesRoomLeft(projectId, max)) === 0) {
    throw new AppError(`This project has reached the limit of ${max} files.`, 403);
  }
}

const WINDOW_MS = 60_000;
const recentRuns = new Map<string, number[]>();

/**
 * Counts runs and terminals per person over the last minute. Kept in memory: the API runs as one
 * instance, and a restart only forgets the last minute.
 */
export function takeRunSlot(userId: string, max = env.RUNS_PER_MINUTE, now = Date.now()) {
  const times = (recentRuns.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (times.length >= max) {
    const wait = Math.ceil((WINDOW_MS - (now - times[0]!)) / 1000);
    recentRuns.set(userId, times);
    throw new AppError(`You started too many programs in a minute. Wait ${wait} s and try again.`, 429);
  }
  times.push(now);
  recentRuns.set(userId, times);
  if (recentRuns.size > 10_000) {
    for (const [id, list] of recentRuns) if (list.every((time) => now - time >= WINDOW_MS)) recentRuns.delete(id);
  }
}
