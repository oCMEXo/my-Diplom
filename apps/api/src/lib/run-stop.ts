import { Redis } from "ioredis";
import { RUN_STOP_CHANNEL, type RunStop } from "@collab/shared";
import { env } from "../env.js";
import { AppError } from "./errors.js";

let publisher: Redis | null = null;

/** Passes a stop request to the runners; only the one that has the run acts on it. */
export async function publishRunStop(stop: RunStop) {
  publisher ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
  try {
    await publisher.publish(RUN_STOP_CHANNEL, JSON.stringify(stop));
  } catch {
    throw new AppError("Could not stop the program. It will stop by itself after 10 seconds.", 503);
  }
}

export async function closeRunStop() {
  publisher?.disconnect();
  publisher = null;
}
