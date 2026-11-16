import { createHash } from "node:crypto";

export function gitBlobSha(content: Uint8Array | string): string {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  return createHash("sha1").update(`blob ${bytes.byteLength}\0`).update(bytes).digest("hex");
}
