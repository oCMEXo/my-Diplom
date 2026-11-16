import { prisma } from "@collab/db";

export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_VERSIONS_PER_FILE = 50;

const latest = new Map<string, { at: number; content: string }>();
const restoring = new Set<string>();

async function latestVersion(fileId: string) {
  const known = latest.get(fileId);
  if (known) return known;
  const row = await prisma.fileVersion.findFirst({
    where: { fileId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true, content: true },
  });
  if (!row) return null;
  const last = { at: row.createdAt.getTime(), content: row.content };
  latest.set(fileId, last);
  return last;
}

export async function snapshotIfChanged(
  fileId: string,
  content: () => string,
  authorId: string | null,
  now = Date.now(),
): Promise<boolean> {
  if (restoring.has(fileId)) return false;

  const last = await latestVersion(fileId);
  if (last && now - last.at < SNAPSHOT_INTERVAL_MS) return false;

  const text = content();
  if (last && last.content === text) return false;

  await recordVersion(fileId, text, authorId, now);
  return true;
}

export async function keepReplacedText(fileId: string, content: string, authorId: string | null) {
  const last = await latestVersion(fileId);
  if (last && last.content === content) return false;
  await recordVersion(fileId, content, authorId);
  return true;
}

export async function recordVersion(fileId: string, content: string, authorId: string | null, now = Date.now()) {
  await prisma.fileVersion.create({
    data: { fileId, content, size: Buffer.byteLength(content), authorId, createdAt: new Date(now) },
  });
  latest.set(fileId, { at: now, content });

  const stale = await prisma.fileVersion.findMany({
    where: { fileId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: MAX_VERSIONS_PER_FILE,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.fileVersion.deleteMany({ where: { id: { in: stale.map((version) => version.id) } } });
  }
}

export async function withoutSnapshots<T>(fileId: string, work: () => Promise<T>): Promise<T> {
  restoring.add(fileId);
  try {
    return await work();
  } finally {
    restoring.delete(fileId);
  }
}

export function forgetFile(fileId: string) {
  latest.delete(fileId);
}
