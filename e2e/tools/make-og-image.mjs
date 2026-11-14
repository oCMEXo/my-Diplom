// Draws the picture that messengers show next to a link to the site (apps/web/public/og.png, 1200 x 630).
//   pnpm --filter @collab/e2e exec node tools/make-og-image.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const web = path.resolve(import.meta.dirname, "../../apps/web");
const font = (subset) =>
  readFileSync(path.join(web, `node_modules/@fontsource-variable/inter/files/inter-${subset}-wght-normal.woff2`)).toString("base64");
const icon = readFileSync(path.join(web, "public/icon.svg"), "utf8");

const html = `<!doctype html>
<html lang="ru">
<style>
  @font-face { font-family: Inter; font-weight: 100 900; src: url(data:font/woff2;base64,${font("cyrillic")}) format("woff2"); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
  @font-face { font-family: Inter; font-weight: 100 900; src: url(data:font/woff2;base64,${font("latin")}) format("woff2"); }
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; background: #1e1f22; color: #fff; font-family: Inter, Arial, sans-serif; }
  .glow { position: absolute; border-radius: 50%; }
  .glow.a { left: -180px; top: -200px; width: 640px; height: 640px; background: rgba(88, 101, 242, 0.5); filter: blur(130px); }
  .glow.b { right: -120px; bottom: -260px; width: 600px; height: 600px; background: rgba(236, 72, 153, 0.3); filter: blur(140px); }
  main { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 700; letter-spacing: -0.01em; }
  .brand svg { width: 64px; height: 64px; }
  h1 { margin: 0; max-width: 940px; font-size: 76px; line-height: 1.08; font-weight: 650; letter-spacing: -0.025em; }
  h1 span { color: #949cf7; }
  ul { margin: 0; padding: 0; list-style: none; display: flex; gap: 14px; }
  li { padding: 12px 24px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); font-size: 24px; white-space: nowrap; color: rgba(255, 255, 255, 0.85); }
</style>
<body>
  <div class="glow a"></div><div class="glow b"></div>
  <main>
    <div class="brand">${icon}Collab</div>
    <h1>Общее пространство, где проект делается <span>вместе</span></h1>
    <ul><li>Вход без регистрации</li><li>Код, документы, доски</li><li>Чат и курсоры коллег</li></ul>
  </main>
</body>
</html>`;

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = path.join(web, "public/og.png");
await page.screenshot({ path: out });
await browser.close();
console.log("written", out);
