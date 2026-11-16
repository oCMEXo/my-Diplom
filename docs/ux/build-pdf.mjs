import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = import.meta.dirname;
const require = createRequire(path.resolve(here, "../../e2e/package.json"));
const { chromium } = require("@playwright/test");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(here, "ux-spec.html")).href, { waitUntil: "load" });
const out = path.join(here, "UX_Harminovich_Artsiom.pdf");
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: '<div style="width:100%;text-align:center;font-size:8pt;color:#57606a"><span class="pageNumber"></span></div>',
});
await browser.close();
console.log("written", out);
