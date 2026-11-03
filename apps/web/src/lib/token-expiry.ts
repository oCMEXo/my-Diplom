/** When a JWT stops being valid (ms since the epoch), or null if the token cannot be read. */
export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** A token that cannot be read counts as expiring: the server decides, and renewing it costs little. */
export function expiresWithin(token: string, marginMs: number, now = Date.now()): boolean {
  const expiry = tokenExpiry(token);
  return expiry === null || expiry - now <= marginMs;
}
