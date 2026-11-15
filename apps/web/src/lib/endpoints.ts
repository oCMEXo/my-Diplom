/** Server URLs can be absolute or relative to the page ("/api" when everything is behind one domain). */

/** The HTTP(S) base of a server, without a trailing slash. */
export function httpBase(base: string, origin: string): string {
  return new URL(base, origin).toString().replace(/\/$/, "");
}

/** A WebSocket URL on the same server: `http` becomes `ws`, `https` becomes `wss`. */
export function wsUrl(base: string, origin: string, path = ""): string {
  const url = new URL(`${httpBase(base, origin)}${path}`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
