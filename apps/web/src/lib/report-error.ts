import type { ClientError } from "@collab/shared";
import { API_URL } from "./api";

const MAX_REPORTS = 10;
const sent = new Set<string>();

const NOISE = [/ResizeObserver loop/, /Failed to fetch/, /NetworkError/, /Load failed/, /AbortError/];

export function reportError(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500) || "Unknown error";
  if (sent.size >= MAX_REPORTS || sent.has(message) || NOISE.some((pattern) => pattern.test(message))) return;
  sent.add(message);
  const body: ClientError = {
    message,
    stack: error instanceof Error ? error.stack?.slice(0, 4000) : undefined,
    url: window.location.pathname,
    release: import.meta.env.MODE,
  };
  fetch(`${API_URL}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function reportUncaughtErrors() {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
}
