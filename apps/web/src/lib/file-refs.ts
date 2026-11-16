export interface FileRefTarget {
  id: string;
  path: string;
}

export type ChatSegment =
  | { kind: "text"; text: string }
  | { kind: "file"; text: string; fileId: string; line: number; column?: number };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function resolve(written: string, files: FileRefTarget[]): FileRefTarget | null {
  const exact = files.find((file) => file.path === written);
  if (exact) return exact;
  const matching = files.filter((file) => file.path.endsWith(`/${written}`));
  return matching.length === 1 ? (matching[0] ?? null) : null;
}

export function createFileRefParser(files: FileRefTarget[]) {
  const known = [...files]
    .sort((a, b) => b.path.length - a.path.length)
    .map((file) => escapeRegExp(file.path))
    .join("|");
  const generic = "[\\p{L}\\p{N}_.@+-]+(?:/[\\p{L}\\p{N}_.@+-]+)*";
  const source = `(?<![\\p{L}\\p{N}_./:-])(${known ? `${known}|` : ""}${generic}):(\\d+)(?::(\\d+))?(?![\\p{L}\\p{N}_])`;

  return (text: string): ChatSegment[] => {
    const segments: ChatSegment[] = [];
    let position = 0;
    for (const match of text.matchAll(new RegExp(source, "gu"))) {
      const line = Number(match[2]);
      const file = line > 0 ? resolve(match[1] ?? "", files) : null;
      if (!file) continue;
      if (match.index > position) segments.push({ kind: "text", text: text.slice(position, match.index) });
      const column = match[3] ? Number(match[3]) : undefined;
      segments.push({ kind: "file", text: match[0], fileId: file.id, line, ...(column ? { column } : {}) });
      position = match.index + match[0].length;
    }
    if (position < text.length) segments.push({ kind: "text", text: text.slice(position) });
    return segments;
  };
}
