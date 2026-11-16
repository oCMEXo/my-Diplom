
export function httpBase(base: string, origin: string): string {
  return new URL(base, origin).toString().replace(/\/$/, "");
}

export function wsUrl(base: string, origin: string, path = ""): string {
  const url = new URL(`${httpBase(base, origin)}${path}`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
