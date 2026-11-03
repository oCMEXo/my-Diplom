/** A browser WebSocket can only carry its token in the address, and logs must not keep it. */
export function withoutToken(url: string): string {
  return url.replace(/([?&]token=)[^&]*/g, "$1***");
}
