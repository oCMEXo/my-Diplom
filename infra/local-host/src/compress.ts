import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

const COMPRESSIBLE = /\.(js|mjs|css|html|svg|json|webmanifest)$/;
const MIN_BYTES = 1024;

const toBrotli = promisify(brotliCompress);
const toGzip = promisify(gzip);

async function* filesIn(folder: string): AsyncGenerator<string> {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) yield* filesIn(full);
    else yield full;
  }
}

async function isFresh(copy: string, source: Date) {
  try {
    return (await stat(copy)).mtime >= source;
  } catch {
    return false;
  }
}

/** Precompresses the text files of the build (.br and .gz) so the host server can send them as they are. */
export async function compressWebRoot(root: string) {
  for await (const file of filesIn(root)) {
    if (!COMPRESSIBLE.test(file)) continue;
    const info = await stat(file);
    if (info.size < MIN_BYTES) continue;
    if ((await isFresh(`${file}.br`, info.mtime)) && (await isFresh(`${file}.gz`, info.mtime))) continue;
    const content = await readFile(file);
    await writeFile(`${file}.br`, await toBrotli(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }));
    await writeFile(`${file}.gz`, await toGzip(content, { level: 9 }));
  }
}
