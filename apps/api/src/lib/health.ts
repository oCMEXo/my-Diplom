import { Redis } from "ioredis";
import { prisma } from "@collab/db";
import { env } from "../env.js";

const CHECK_TIMEOUT_MS = 5000;

let redis: Redis | null = null;

function withTimeout<T>(work: Promise<T>) {
  return Promise.race([
    work,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS).unref()),
  ]);
}

async function check(work: () => Promise<unknown>) {
  try {
    await withTimeout(work());
    return "ok" as const;
  } catch {
    return "down" as const;
  }
}

export async function readiness() {
  redis ??= new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  const [database, cache] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(async () => {
      if (redis!.status === "wait" || redis!.status === "end") await redis!.connect();
      await redis!.ping();
    }),
  ]);
  return { status: database === "ok" && cache === "ok" ? ("ok" as const) : ("down" as const), database, redis: cache };
}

export async function closeHealthChecks() {
  redis?.disconnect();
  redis = null;
}
