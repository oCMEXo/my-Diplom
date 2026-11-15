import { Worker } from "bullmq";
import Docker from "dockerode";
import { Redis } from "ioredis";
import {
  ACCESS_CHANGES_CHANNEL,
  accessChangeSchema,
  RUN_EVENTS_CHANNEL,
  RUN_QUEUE_NAME,
  RUN_STOP_CHANNEL,
  runStopSchema,
  TERMINAL_MAX_MINUTES,
  TERMINAL_TICKET_PREFIX,
  terminalTicketDataSchema,
} from "@collab/shared";
import type { RunEvent } from "@collab/shared";
import { env } from "./env.js";
import { processRunJob } from "./worker.js";
import { ensureTerminalImage } from "./terminal/image.js";
import { createTerminalServer } from "./terminal/server.js";
import { openTerminalSession } from "./terminal/session.js";

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const publisher = new Redis(env.REDIS_URL);

const publish = (event: RunEvent) => publisher.publish(RUN_EVENTS_CHANNEL, JSON.stringify(event));

// Runs executing here, so a stop request can find them.
const active = new Map<string, { projectId: string; controller: AbortController }>();

const worker = new Worker(
  RUN_QUEUE_NAME,
  async (job) => {
    const { runId, projectId } = job.data as { runId: string; projectId: string };
    const controller = new AbortController();
    active.set(runId, { projectId, controller });
    try {
      return await processRunJob(job.data, publish, undefined, controller.signal);
    } finally {
      active.delete(runId);
    }
  },
  {
  connection,
    concurrency: env.RUNNER_CONCURRENCY,
  },
);

const stops = new Redis(env.REDIS_URL);
void stops.subscribe(RUN_STOP_CHANNEL);
stops.on("message", (_channel, raw) => {
  try {
    const stop = runStopSchema.safeParse(JSON.parse(raw));
    const run = stop.success ? active.get(stop.data.runId) : undefined;
    if (run && stop.success && run.projectId === stop.data.projectId) run.controller.abort();
  } catch {
    // a malformed message stops nothing
  }
});

worker.on("failed", (job, error) => {
  console.error(`run ${job?.id ?? "?"} failed:`, error.message);
});

console.log(`runner listening on queue "${RUN_QUEUE_NAME}" (concurrency ${env.RUNNER_CONCURRENCY})`);

const tickets = new Redis(env.REDIS_URL);
const docker = new Docker();
const terminals =
  env.TERMINAL_PORT > 0
    ? createTerminalServer({
        takeTicket: async (ticket) => {
          const raw = await tickets.getdel(`${TERMINAL_TICKET_PREFIX}${ticket}`);
          if (!raw) return null;
          const parsed = terminalTicketDataSchema.safeParse(JSON.parse(raw));
          return parsed.success ? parsed.data : null;
        },
        openSession: async (options) => {
          await ensureTerminalImage(docker);
          return openTerminalSession(docker, options, env.SANDBOX_RUNTIME);
        },
        maxMs: TERMINAL_MAX_MINUTES * 60_000,
        maxPerUser: env.TERMINAL_MAX_PER_USER,
        maxTotal: env.TERMINAL_MAX_TOTAL,
      })
    : null;

// The API announces when access is taken away; a terminal already open must not outlive it.
const accessChanges = new Redis(env.REDIS_URL);
if (terminals) {
  void accessChanges.subscribe(ACCESS_CHANGES_CHANNEL);
  accessChanges.on("message", (_channel, raw) => {
    try {
      const change = accessChangeSchema.safeParse(JSON.parse(raw));
      if (change.success) terminals.closeFor(change.data.projectId, change.data.userId);
    } catch {
      // a malformed message changes nothing
    }
  });
  terminals.listen(env.TERMINAL_PORT, env.TERMINAL_HOST, () => {
    console.log(`terminals on ws://${env.TERMINAL_HOST}:${env.TERMINAL_PORT}`);
  });
}
// The terminal image also runs C, C++ and Java programs, so it is built in advance either way.
ensureTerminalImage(docker).catch((error) => console.error("toolchain image:", error.message));

async function shutdown() {
  terminals?.close();
  await tickets.quit();
  await accessChanges.quit();
  await stops.quit();
  await worker.close();
  await publisher.quit();
  await connection.quit();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
