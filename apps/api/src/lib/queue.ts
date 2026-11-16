import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { RUN_QUEUE_NAME } from "@collab/shared";
import type { RunJob } from "@collab/shared";
import { env } from "../env.js";
import { AppError } from "./errors.js";

export const MAX_WAITING_RUNS = 100;

let connection: Redis | null = null;
let queue: Queue<RunJob> | null = null;

function getQueue() {
  if (!queue) {
    connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue<RunJob>(RUN_QUEUE_NAME, {
      connection,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: 100, attempts: 1 },
    });
  }
  return queue;
}

export interface RunQueue {
  getWaitingCount(): Promise<number>;
  add(name: "run", job: RunJob, options: { jobId: string }): Promise<unknown>;
}

export async function enqueueRun(job: RunJob, queue: RunQueue = getQueue()) {
  if ((await queue.getWaitingCount()) >= MAX_WAITING_RUNS) {
    throw new AppError("Too many programs are running right now. Please try again in a minute.", 429);
  }
  await queue.add("run", job, { jobId: job.runId });
}

export async function closeRunQueue() {
  await queue?.close();
  connection?.disconnect();
  queue = null;
  connection = null;
}
