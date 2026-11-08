// Renders docs/ba/diagrams/*.mmd to PNG (4x) in docs/ba/img with Mermaid in a real browser.
//   node docs/ba/build/render-diagrams.mjs [name-prefix ...]
// Playwright is taken from the e2e package; Mermaid is loaded from a CDN, so this needs the internet.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const here = import.meta.dirname;
const require = createRequire(path.resolve(here, "../../../e2e/package.json"));
const { chromium } = require("@playwright/test");

const src = path.resolve(here, "../diagrams");
const out = path.resolve(here, "../img");
const only = process.argv.slice(2);
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/&lt;br>/g, "<br>");

const browser = await chromium.launch({ channel: "chrome" });
for (const file of readdirSync(src).filter((name) => name.endsWith(".mmd"))) {
  if (only.length && !only.some((name) => file.startsWith(name))) continue;
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 4 });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:16px;background:#fff;display:inline-block">
    <pre class="mermaid">${escape(readFileSync(path.join(src, file), "utf8"))}</pre>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Arial, sans-serif", fontSize: 15 });
      try { await mermaid.run(); } catch (error) { document.body.dataset.error = String(error); }
      document.body.dataset.done = "1";
    </script></body></html>`);
  await page.waitForSelector("body[data-done]", { timeout: 30000 });
  const error = await page.getAttribute("body", "data-error");
  if (error) throw new Error(`${file}: ${error}`);
  await page.locator("body").screenshot({ path: path.join(out, file.replace(/\.mmd$/, ".png")) });
  await page.close();
  console.log("rendered", file);
}
await browser.close();
