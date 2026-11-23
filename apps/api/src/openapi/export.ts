import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

process.env.DATABASE_URL ??= "postgresql://collab:collab@localhost:5433/collab?schema=public";
process.env.JWT_ACCESS_SECRET ??= "openapi-export-access-secret";
process.env.JWT_REFRESH_SECRET ??= "openapi-export-refresh-secret";

export const SPEC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs/api");

export async function buildSpec() {
  const { buildApp } = await import("../app.js");
  const app = await buildApp({ runEnabled: true, rateLimit: { perMinute: 0, authPerMinute: 0 } });
  try {
    await app.ready();
    return app.swagger() as Record<string, unknown>;
  } finally {
    await app.close();
  }
}

export function specFiles(spec: Record<string, unknown>) {
  return {
    "openapi.json": `${JSON.stringify(spec, null, 2)}\n`,
    "openapi.yaml": stringify(spec, { lineWidth: 0 }),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = specFiles(await buildSpec());
  mkdirSync(SPEC_DIR, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(SPEC_DIR, name), content);
    console.log(`wrote docs/api/${name}`);
  }
}
