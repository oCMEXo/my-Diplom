import type { FastifyBaseLogger } from "fastify";
import { purgeStaleGuests } from "../modules/auth/auth.service.js";
import { purgeExpiredTrash } from "../modules/files/files.service.js";

const HOUR_MS = 60 * 60 * 1000;

/** Purges expired trash and unused guest accounts now and then every hour. Returns a stop function. */
export function startCleanup(log: FastifyBaseLogger, intervalMs = HOUR_MS) {
  let running = false;

  const run = async () => {
    // Don't let a slow pass overlap the next one.
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
