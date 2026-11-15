/** Browser WebSockets pass the token in the URL, so strip it before logging. */
export function withoutToken(url: string): string {
  return url.replace(/([?&]token=)[^&]*/g, "$1***");
}
