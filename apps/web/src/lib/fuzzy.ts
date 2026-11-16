function match(needle: string, haystack: string, nameStart: number): number | null {
  let score = 0;
  let position = 0;
  let previous = -2;
  for (const char of needle) {
    const found = haystack.indexOf(char, position);
    if (found === -1) return null;
    if (found === previous + 1) score += 5;
    if (found >= nameStart) score += 3;
    if (found === 0 || "/._- ".includes(haystack[found - 1]!)) score += 4;
    if (found > position) score -= 1;
    previous = found;
    position = found + 1;
  }
  return score;
}

export function fuzzyScore(query: string, path: string): number | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  const haystack = path.toLowerCase();
  const nameStart = haystack.lastIndexOf("/") + 1;

  const inName = match(needle, haystack.slice(nameStart), 0);
  const inPath = match(needle, haystack, nameStart);
  const best = Math.max(inName === null ? -Infinity : inName + 20, inPath ?? -Infinity);
  return best === -Infinity ? null : best - path.length / 100;
}

export function fuzzyFilter<T extends { path: string }>(items: T[], query: string): T[] {
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = fuzzyScore(query, item.path);
    if (score !== null) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.path.localeCompare(b.item.path));
  return scored.map((entry) => entry.item);
}
