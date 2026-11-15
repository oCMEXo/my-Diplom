const HIGH_WATER_BYTES = 1024 * 1024;
const LOW_WATER_BYTES = 256 * 1024;
const CHECK_MS = 100;

/** Backpressure: stop reading from the program while too much output is waiting to be sent. */
export function createOutputGate({
  buffered,
  pause,
  resume,
  high = HIGH_WATER_BYTES,
  low = LOW_WATER_BYTES,
  checkMs = CHECK_MS,
}: {
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
