const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function clock(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "just now", "5 minutes ago", "2 hours ago", "yesterday at 14:05", "3 October at 14:05". */
export function versionAge(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return relative.format(-Math.floor(elapsed / MINUTE), "minute");
  if (sameDay(date, now)) return relative.format(-Math.floor(elapsed / HOUR), "hour");

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `yesterday at ${clock(date)}`;

  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
  return `${day} at ${clock(date)}`;
}

/** The exact moment, for a tooltip next to the relative one. */
export function versionMoment(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("en-GB", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("en-GB", { maximumFractionDigits: 1 })} MB`;
}
