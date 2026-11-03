// Renders the DOCX page by page in a browser (docx-preview) to check the layout without Word.
//   node docs/ba/build/preview-docx.mjs   -> docs/ba/build/preview/page-NN.png
// docx-preview approximates Word: page breaks and fonts can differ slightly.
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const here = import.meta.dirname;
const require = createRequire(path.resolve(here, "../../../e2e/package.json"));
const { chromium } = require("@playwright/test");

const out = path.join(here, "preview");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const docx = readFileSync(path.resolve(here, "../BA_Harminovich_Artsiom.docx")).toString("base64");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page.setContent(`<!doctype html><html><head>
  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js"></script>
  </head><body style="margin:0;background:#888"><div id="c"></div></body></html>`);
await page.waitForFunction(() => window.docx && window.JSZip);
await page.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  await window.docx.renderAsync(bytes, document.getElementById("c"), null, { breakPages: true, ignoreLastRenderedPageBreak: false });
}, docx);
// docx-preview breaks pages only at explicit breaks, so the result is cut into A4-high slices.
const sections = page.locator("section.docx");
let n = 0;
for (let s = 0; s < (await sections.count()); s++) {
  const box = await sections.nth(s).boundingBox();
  const sliceH = Math.round(box.width * 1.414);
  for (let y = 0; y < box.height; y += sliceH) {
    n += 1;
    await page.screenshot({ path: path.join(out, `page-${String(n).padStart(2, "0")}.png`), fullPage: true,
      clip: { x: box.x, y: box.y + y, width: box.width, height: Math.min(sliceH, box.height - y) } });
  }
}
console.log("slices", n);
await browser.close();
