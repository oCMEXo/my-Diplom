import type { FastifyBaseLogger } from "fastify";
import { purgeStaleGuests } from "../modules/auth/auth.service.js";
import { purgeExpiredTrash } from "../modules/files/files.service.js";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Deletes what its storage period has ended for, right away and then every hour: files in the trash
 * and guest accounts that nobody uses. Returns a function that stops it.
 */
export function startCleanup(log: FastifyBaseLogger, intervalMs = HOUR_MS) {
  let running = false;

  const run = async () => {
    // A slow pass must not overlap the next one.
    if (running) return;
    running = true;
    try {
      const purged = await purgeExpiredTrash();
      if (purged > 0) log.info({ purged }, "expired files removed from the trash");
      const guests = await purgeStaleGuests();
      if (guests > 0) log.info({ guests }, "unused guest accounts deleted");
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
