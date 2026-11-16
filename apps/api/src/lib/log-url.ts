export function withoutToken(url: string): string {
  return url.replace(/([?&]token=)[^&]*/g, "$1***");
}
