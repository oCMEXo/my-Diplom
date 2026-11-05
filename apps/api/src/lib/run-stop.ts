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
    throw new AppError("Не удалось остановить программу. Через 10 секунд она остановится сама.", 503);
  }
}

export async function closeRunStop() {
  publisher?.disconnect();
  publisher = null;
}
