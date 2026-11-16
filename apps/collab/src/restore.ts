import type { Extension, Hocuspocus } from "@hocuspocus/server";
import type { Text as YText } from "yjs";
import { prisma } from "@collab/db";
import { AccessError, resolveFileAccess } from "./lib/access.js";
import { keepReplacedText, withoutSnapshots } from "./versions.js";

const RESTORE_URL = /^\/files\/([0-9a-f-]{36})\/versions\/([0-9a-f-]{36})\/restore$/i;

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

export function replaceText(text: YText, next: string) {
  const current = text.toString();
  const max = Math.min(current.length, next.length);
  let start = 0;
  while (start < max && current[start] === next[start]) start++;
  if (start > 0 && isHighSurrogate(current.charCodeAt(start - 1))) start--;
  let end = 0;
  while (end < max - start && current[current.length - 1 - end] === next[next.length - 1 - end]) end++;
  if (end > 0 && isLowSurrogate(current.charCodeAt(current.length - end))) end--;

  const removed = current.length - start - end;
  if (removed > 0) text.delete(start, removed);
  if (next.length - start - end > 0) text.insert(start, next.slice(start, next.length - end));
}

export function withLineBreaksOf(text: string, current: string) {
  if (!current.includes("\n")) return text;
  const lf = text.replace(/\r\n/g, "\n");
  return current.includes("\r\n") ? lf.replace(/\n/g, "\r\n") : lf;
}

export async function restoreVersion(instance: Hocuspocus, fileId: string, versionId: string, userId: string) {
  const version = await prisma.fileVersion.findFirst({ where: { id: versionId, fileId }, select: { content: true } });
  if (!version) throw new AccessError("Version not found", 404);

  await withoutSnapshots(fileId, async () => {
    const connection = await instance.openDirectConnection(fileId, { userId });
    try {
      const document = connection.document!;
      let before = "";
      let after = "";
      document.transact(() => {
        const text = document.getText("monaco");
        before = text.toString();
        after = withLineBreaksOf(version.content, before);
        replaceText(text, after);
      });
      if (before !== after) await keepReplacedText(fileId, before, userId);
    } finally {
      await connection.disconnect();
    }
  });
}

export const restoreExtension: Extension = {
  async onRequest({ request, response, instance }) {
    const path = new URL(request.url ?? "/", "http://collab").pathname;
    const match = request.method === "POST" ? RESTORE_URL.exec(path) : null;
    if (!match) return;
    const [, fileId, versionId] = match;

    try {
      const token = /^Bearer (.+)$/.exec(request.headers.authorization ?? "")?.[1] ?? "";
      const access = await resolveFileAccess(token, fileId);
      if (access.role === "viewer") throw new AccessError("Viewers cannot restore versions", 403);
      await restoreVersion(instance, fileId, versionId, access.userId);
      response.writeHead(204).end();
    } catch (err) {
      const status = err instanceof AccessError ? err.status : 500;
      if (status === 500) console.error("[versions] restore failed", err);
      response
        .writeHead(status, { "Content-Type": "application/json" })
        .end(JSON.stringify({ message: err instanceof AccessError ? err.message : "Restore failed" }));
    }
    return Promise.reject();
  },
};
