const HIGH_WATER_BYTES = 1024 * 1024;
const LOW_WATER_BYTES = 256 * 1024;
const CHECK_MS = 100;

/**
 * `yes` in a terminal writes far faster than a browser reads, and what is not yet sent stays in the
 * runner's memory. So reading from the program stops while too much is waiting, and starts again later.
 */
export function createOutputGate({
  buffered,
  pause,
  resume,
  high = HIGH_WATER_BYTES,
  low = LOW_WATER_BYTES,
  checkMs = CHECK_MS,
}: {
  /** How many bytes are waiting to be sent. */
  buffered: () => number;
  pause: () => void;
  resume: () => void;
  high?: number;
  low?: number;
  checkMs?: number;
}) {
  let timer: NodeJS.Timeout | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  return {
    /** Call after sending output. */
    check() {
      if (timer || buffered() <= high) return;
      pause();
      timer = setInterval(() => {
        if (buffered() > low) return;
        stop();
        resume();
      }, checkMs);
      timer.unref();
    },
    stop,
  };
}
