import { randomUUID } from "node:crypto";
import { prisma } from "@collab/db";
import { MAX_RUN_FILES, MAX_RUN_FILES_BYTES, inferLanguage, runnableLanguageList, toRunnableLanguage } from "@collab/shared";
import type { RunJob } from "@collab/shared";
import { AppError } from "../../lib/errors.js";
import { requireProjectRole } from "../../lib/authorization.js";
import { enqueueRun } from "../../lib/queue.js";
import { publishRunStop } from "../../lib/run-stop.js";
import { yjsStateToText } from "../../lib/yjs-text.js";
import { takeRunSlot } from "../../lib/limits.js";
import { recordUsage } from "../../lib/usage.js";

export async function projectTextFiles(projectId: string, branch: string, exceptId?: string) {
  const rows = await prisma.file.findMany({
    where: {
      projectId,
      branch,
      type: { not: "board" },
      deletedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { path: true, yjsState: true },
  });
  const candidates = rows
    .filter((row) => !row.path.split("/").includes("node_modules"))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));

  const files: { path: string; content: string }[] = [];
  let bytes = 0;
  for (const row of candidates) {
    const content = yjsStateToText(row.yjsState);
    const size = Buffer.byteLength(content);
    if (files.length >= MAX_RUN_FILES || bytes + size > MAX_RUN_FILES_BYTES) continue;
    files.push({ path: row.path, content });
    bytes += size;
  }
  return files;
}

const ENQUEUE_TIMEOUT_MS = 5000;

function failAfter(ms: number) {
  return new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new AppError("Running code is not available right now. Please try a bit later.", 503)), ms).unref();
  });
}

export async function requestStop(
  userId: string,
  projectId: string,
  runId: string,
  publish: typeof publishRunStop = publishRunStop,
) {
  await requireProjectRole(projectId, userId, "editor");
  await publish({ runId, projectId });
}

export async function requestRun(
  userId: string,
  projectId: string,
  fileId: string,
  code: string,
  enqueue: (job: RunJob) => Promise<void> = enqueueRun,
  enqueueTimeoutMs = ENQUEUE_TIMEOUT_MS,
) {
  await requireProjectRole(projectId, userId, "editor");
  takeRunSlot(userId);

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.projectId !== projectId || file.deletedAt) {
    throw new AppError("File not found", 404);
  }
  if (file.type !== "code") {
    throw new AppError("Only code files can run", 400);
  }

  const language = toRunnableLanguage(file.language ?? inferLanguage(file.path));
  if (!language) {
    throw new AppError(`Only ${runnableLanguageList()} files can run`, 400);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true },
  });

  const runId = randomUUID();
  const job = {
    runId,
    projectId,
    fileId,
    language,
    code,
    entry: file.path,
    files: await projectTextFiles(projectId, file.branch, fileId),
    startedBy: { id: user.id, name: user.name },
  };
  await Promise.race([enqueue(job), failAfter(enqueueTimeoutMs)]);
  recordUsage("run_started", { userId, projectId });

  return { runId };
}
