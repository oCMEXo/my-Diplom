import type { FastifyBaseLogger } from "fastify";
import { purgeStaleGuests } from "../modules/auth/auth.service.js";
import { purgeExpiredTrash } from "../modules/files/files.service.js";
import { purgeOldUsage } from "./usage.js";

const HOUR_MS = 60 * 60 * 1000;

export function startCleanup(log: FastifyBaseLogger, intervalMs = HOUR_MS) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const purged = await purgeExpiredTrash();
      if (purged > 0) log.info({ purged }, "expired files removed from the trash");
      const guests = await purgeStaleGuests();
      if (guests > 0) log.info({ guests }, "unused guest accounts deleted");
      await purgeOldUsage();
    } catch (error) {
      log.error(error);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref();

  return async () => {
    clearInterval(timer);
  };
}
