import { TOKEN_PATTERN } from "./harness.js";

export function exponential(random: () => number, meanMs: number) {
  return -Math.log(1 - random()) * meanMs;
}

export function boundaryPosition(text: string, random: () => number): number {
  const boundaries = [0];
  for (const match of text.matchAll(TOKEN_PATTERN)) boundaries.push(match.index + match[0].length);
  return boundaries[Math.floor(random() * boundaries.length)]!;
}

export function tokenFor(clientId: string, seq: number) {
  return `<${clientId}.${seq}>`;
}

export function wallClock() {
  return performance.timeOrigin + performance.now();
}
