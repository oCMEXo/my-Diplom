import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const here = import.meta.dirname;
const require = createRequire(path.resolve(here, "../../e2e/package.json"));
const { chromium } = require("@playwright/test");

const WEB = process.env.WEB_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://localhost:3001";
const IMG = path.join(here, "img");
const PDF = path.join(here, "Adaptive_UI_Harminovich_Artsiom.pdf");

const DEVICES = {
  phone: { width: 390, height: 844, touch: true, label: "Phone · 390 × 844" },
  "phone-landscape": { width: 844, height: 390, touch: true, label: "Phone, landscape · 844 × 390" },
  tablet: { width: 820, height: 1180, touch: true, label: "Tablet · 820 × 1180" },
  "tablet-landscape": { width: 1180, height: 820, touch: true, label: "Tablet, landscape · 1180 × 820" },
  desktop: { width: 1440, height: 900, touch: false, label: "Desktop · 1440 × 900" },
  "desktop-zoom": { width: 720, height: 450, touch: false, label: "Desktop at 200% zoom · 1440 × 900 window" },
};

async function call(method, route, token, body) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function seed() {
  const guest = await call("POST", "/auth/guest", null, { name: "Anna" });
  const owner = await call("POST", "/auth/upgrade", guest.tokens.accessToken, {
    email: `anna-${Date.now()}@example.com`,
    password: "mockup-password-1",
  });
  const auth = { user: { ...guest.user, ...owner, emailVerified: true }, tokens: guest.tokens };
  const token = auth.tokens.accessToken;
  const project = await call("POST", "/projects", token, { name: "Algorithms homework", template: "python" });
  await call("POST", "/projects", token, { name: "Team notes", template: "javascript" });
  await call("POST", "/projects", token, { name: "Course project" });
  await call("POST", `/projects/${project.id}/files`, token, { path: "src/sort.py", type: "code" });
  await call("POST", `/projects/${project.id}/messages`, token, { body: "I fixed the loop in main.py, please check it" });
  const files = await call("GET", `/projects/${project.id}/files`, token);
  const boris = await call("POST", "/auth/guest", null, { name: "Boris" });
  await call("POST", `/join/${project.inviteCode}`, boris.tokens.accessToken);
  await call("POST", `/projects/${project.id}/messages`, boris.tokens.accessToken, { body: "Great, I will write the merge sort in src/sort.py" });
  return { auth, project, main: files.find((f) => f.path === "main.py") };
}

async function capture(browser, data) {
  mkdirSync(IMG, { recursive: true });
  const editor = `/projects/${data.project.id}/files/${data.main.id}`;
  const plan = [
    ["phone", "dark", false, "landing", "/"],
    ["phone", "dark", false, "login", "/login"],
    ["phone", "dark", true, "projects", "/"],
    ["phone", "dark", true, "editor", editor],
    ["phone", "dark", true, "editor-files", editor, "Project menu"],
    ["phone", "dark", true, "editor-chat", editor, "Show chat and members"],
    ["phone", "light", true, "projects", "/"],
    ["phone", "light", true, "editor", editor],
    ["phone-landscape", "dark", true, "editor", editor],
    ["tablet", "dark", false, "landing", "/"],
    ["tablet", "dark", true, "projects", "/"],
    ["tablet", "dark", true, "editor", editor],
    ["tablet", "dark", true, "editor-files", editor, "Project menu"],
    ["tablet-landscape", "dark", true, "editor", editor],
    ["tablet-landscape", "light", true, "projects", "/"],
    ["desktop", "dark", false, "landing", "/"],
    ["desktop", "dark", false, "login", "/login"],
    ["desktop", "dark", true, "projects", "/"],
    ["desktop", "dark", true, "editor", editor],
    ["desktop", "light", true, "editor", editor],
    ["desktop-zoom", "dark", true, "editor", editor],
    ["desktop-zoom", "dark", true, "projects", "/"],
  ];
  const shots = {};
  for (const [device, theme, signedIn, name, route, click] of plan) {
    const size = DEVICES[device];
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      hasTouch: size.touch,
      isMobile: size.touch && size.width < 900,
      colorScheme: theme,
    });
    await context.addInitScript(
      ({ stored, theme }) => {
        localStorage.setItem("collab.theme", theme);
        if (stored) localStorage.setItem("collab.auth", stored);
      },
      { stored: signedIn ? JSON.stringify({ user: data.auth.user, tokens: data.auth.tokens }) : null, theme },
    );
    const page = await context.newPage();
    await page.goto(`${WEB}${route}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    if (click) {
      await page.getByRole("button", { name: click }).first().click();
      await page.waitForTimeout(600);
    }
    const file = `${device}-${name}${theme === "light" ? "-light" : ""}.jpg`;
    await page.screenshot({ path: path.join(IMG, file), type: "jpeg", quality: 82 });
    shots[`${device}/${name}/${theme}`] = file;
    await context.close();
  }

  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
    await context.addInitScript((theme) => localStorage.setItem("collab.theme", theme), theme);
    const page = await context.newPage();
    await page.goto(`${WEB}/design-system`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    const sections = page.locator("main section");
    const count = await sections.count();
    for (let i = 0; i < count; i++) {
      const file = `library-${theme}-${i + 1}.jpg`;
      const box = await sections.nth(i).boundingBox();
      await page.screenshot({
        path: path.join(IMG, file),
        type: "jpeg",
        quality: 85,
        fullPage: true,
        clip: { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 20), width: box.width + 48, height: box.height + 40 },
      });
      shots[`library/${theme}/${i + 1}`] = file;
    }
    await context.close();
  }
  return shots;
}

const image = (file) => `data:image/jpeg;base64,${readFileSync(path.join(IMG, file)).toString("base64")}`;

function frame(file, device, caption, notes = []) {
  const size = DEVICES[device];
  const kind = device.startsWith("phone") ? "phone" : device.startsWith("tablet") ? "tablet" : "desktop";
  return `<figure class="device ${kind} ${device}">
    <div class="screen" style="aspect-ratio:${size.width}/${size.height}"><img src="${image(file)}"></div>
    <figcaption><b>${caption}</b><span>${size.label}</span>${notes.map((n) => `<em>${n}</em>`).join("")}</figcaption>
  </figure>`;
}

function page(title, intro, body, cls = "") {
  return `<section class="page ${cls}"><header><h2>${title}</h2>${intro ? `<p>${intro}</p>` : ""}</header><div class="body">${body}</div></section>`;
}

function html(shots) {
  const s = (device, name, theme = "dark") => shots[`${device}/${name}/${theme}`];
  const lib = (theme, i) => `<img class="lib" src="${image(shots[`library/${theme}/${i}`])}">`;
  const pages = [];

  pages.push(`<section class="page cover">
    <div>
      <p class="kicker">Diploma project · Adaptive UI (Web / Mobile)</p>
      <h1>Collab: adaptive interface</h1>
      <p class="lead">Mock-ups for phone, tablet and desktop, and the library of reusable components they are built from.</p>
      <p class="meta">Artsiom Harminovich · Supervisor: Maksym Svynarenko · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p class="meta">Live app: https://35-228-155-63.sslip.io · Repository: https://github.com/oCMEXo/my-Diplom · Component library in the app: /design-system</p>
    </div>
    <div class="cover-shots">${frame(s("desktop", "editor"), "desktop", "Desktop")}${frame(s("tablet", "projects"), "tablet", "Tablet")}${frame(s("phone", "editor"), "phone", "Phone")}</div>
  </section>`);

  pages.push(page(
    "How the requirements are met",
    "Every screen was checked automatically on 7 screen sizes in both themes. The test is part of the end-to-end suite (e2e/tests/adaptive.spec.ts) and runs on every push.",
    `<table class="req">
      <tr><th>Requirement</th><th>How</th></tr>
      <tr><td>Phone, tablet and desktop, orientation change, browser zoom</td><td>Mobile-first Tailwind breakpoints (sm 640, md 768, lg 1024 px) and container queries for the editor header. Checked at 320, 375 and 812 px (phone, both orientations), 768 and 1024 px (tablet, both orientations), 1440 px, and 1440 px at 200% zoom.</td></tr>
      <tr><td>Responsive grid, relative units, no overlapping</td><td>CSS grid and flexbox; type and spacing in rem, so browser zoom scales everything. The test fails if the page scrolls sideways or two controls overlap. Row actions in the file list and the delete button on project cards sit next to their link, not on top of it.</td></tr>
      <tr><td>Main navigation on every device</td><td>Desktop: project rail, file list and chat are always on screen. Phone and tablet: the same navigation opens from the menu and chat buttons in the editor header, as full-height drawers.</td></tr>
      <tr><td>Touch targets of at least 44 px</td><td>On touch screens (pointer: coarse) every button, link, field, tab and menu item gets min-height and min-width 44 px. Actions that need hover on desktop are always visible on touch screens. The test measures every control.</td></tr>
      <tr><td>Text contrast WCAG 2.1 AA (4.5:1)</td><td>The test computes the contrast of every visible text against its real background. The lowest text color is 5.03:1 (dark) and 5.09:1 (light).</td></tr>
      <tr><td>One palette and type on all devices</td><td>Colors are CSS variables with a dark and a light theme; Inter for the interface and JetBrains Mono for code. The sizes do not change between devices, only the layout does.</td></tr>
      <tr><td>Mock-ups for 3 devices with a component library</td><td>Pages 3–11 of this document. The library is a page of the app (/design-system) built from the same React components as the screens, so it never goes out of date.</td></tr>
    </table>`,
  ));

  pages.push(page("Component library: colors", "Surfaces and text colors with their measured contrast, dark theme.", `${lib("dark", 1)}${lib("dark", 2)}`, "lib-page"));
  pages.push(page("Component library: light theme and typography", "The same tokens in the light theme, and the type scale used on every device.", `${lib("light", 2)}${lib("dark", 3)}`, "lib-page"));
  pages.push(page("Component library: controls", "Buttons in four variants and three sizes, icon buttons, fields with hint and error, badges and avatars.", `${lib("dark", 4)}${lib("dark", 5)}${lib("dark", 6)}`, "lib-page"));
  pages.push(page("Component library: patterns and breakpoints", "Segmented control, file list row and the layout rules for each device.", `${lib("dark", 7)}${lib("dark", 8)}${lib("dark", 9)}`, "lib-page"));

  pages.push(page(
    "Phone",
    "One column. The editor gets the whole screen; files and chat open as drawers from the header. All controls are at least 44 × 44 px.",
    `<div class="row">
      ${frame(s("phone", "landing"), "phone", "Landing", ["Main actions first, then the preview"])}
      ${frame(s("phone", "login"), "phone", "Sign in", ["Fields 44 px high"])}
      ${frame(s("phone", "projects"), "phone", "Projects", ["Cards in one column"])}
      ${frame(s("phone", "editor"), "phone", "Editor", ["Menu, run, terminal, chat in the header"])}
      ${frame(s("phone", "editor-files"), "phone", "Files drawer", ["Main navigation", "Rename and delete always visible"])}
      ${frame(s("phone", "editor-chat"), "phone", "Chat drawer", ["Chat and members"])}
    </div>
    <div class="row">${frame(s("phone-landscape", "editor"), "phone-landscape", "Editor, landscape", ["The same header, more room for code"])}</div>`,
  ));

  pages.push(page(
    "Tablet",
    "Portrait: two columns of project cards, the editor at full width with drawers. Landscape (1180 px): the desktop layout with the file list and the project rail.",
    `<div class="row">
      ${frame(s("tablet", "landing"), "tablet", "Landing")}
      ${frame(s("tablet", "projects"), "tablet", "Projects", ["2 columns"])}
      ${frame(s("tablet", "editor"), "tablet", "Editor")}
      ${frame(s("tablet", "editor-files"), "tablet", "Files drawer", ["Main navigation"])}
    </div>
    <div class="row">${frame(s("tablet-landscape", "editor"), "tablet-landscape", "Editor, landscape", ["Desktop layout: rail, files, editor"])}</div>`,
  ));

  pages.push(page(
    "Desktop",
    "Project rail, file list, editor and chat side by side. Compact controls for a mouse, actions on hover, keyboard shortcuts.",
    `<div class="grid2">
      ${frame(s("desktop", "landing"), "desktop", "Landing")}
      ${frame(s("desktop", "login"), "desktop", "Sign in")}
      ${frame(s("desktop", "projects"), "desktop", "Projects", ["3 columns"])}
      ${frame(s("desktop", "editor"), "desktop", "Editor with chat")}
    </div>`,
  ));

  pages.push(page(
    "Orientation and zoom",
    "Turning the device or zooming the browser changes the layout, not the content. At 200% zoom a 1440 px window behaves like a 720 px screen and gets the tablet layout.",
    `<div class="grid2">
      ${frame(s("phone-landscape", "editor"), "phone-landscape", "Phone, landscape")}
      ${frame(s("tablet-landscape", "editor"), "tablet-landscape", "Tablet, landscape")}
      ${frame(s("desktop-zoom", "editor"), "desktop-zoom", "Editor at 200%")}
      ${frame(s("desktop-zoom", "projects"), "desktop-zoom", "Projects at 200%")}
    </div>`,
  ));

  pages.push(page(
    "One palette in both themes",
    "The light theme uses the same components and the same contrast rules on every device.",
    `<div class="row">
      ${frame(s("phone", "projects", "light"), "phone", "Phone")}
      ${frame(s("phone", "editor", "light"), "phone", "Phone")}
      ${frame(s("tablet-landscape", "projects", "light"), "tablet-landscape", "Tablet, landscape")}
    </div>
    <div class="row">${frame(s("desktop", "editor", "light"), "desktop", "Desktop")}</div>`,
  ));

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 420mm 297mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, "Segoe UI", Arial, sans-serif; color: #1e1f22; background: #fff; }
    .page { width: 420mm; height: 297mm; padding: 14mm 16mm; page-break-after: always; display: flex; flex-direction: column; overflow: hidden; }
    .page header h2 { margin: 0; font-size: 30px; }
    .page header p { margin: 6px 0 0; font-size: 15px; color: #4e5058; max-width: 1100px; }
    .body { flex: 1; min-height: 0; margin-top: 18px; }
    .cover { background: #1e1f22; color: #dbdee1; justify-content: space-between; }
    .cover h1 { font-size: 64px; margin: 8px 0; color: #fff; }
    .kicker { color: #949cf7; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
    .lead { font-size: 22px; max-width: 900px; }
    .meta { color: #b5bac1; margin: 4px 0; font-size: 14px; }
    .cover-shots { display: flex; align-items: flex-end; gap: 28px; height: 145mm; }
    .cover-shots .desktop { width: 55%; } .cover-shots .tablet { width: 23%; } .cover-shots .phone { width: 13%; }
    .cover figcaption { color: #b5bac1; } .cover figcaption b { color: #fff; }
    .row { display: flex; gap: 18px; align-items: flex-start; justify-content: center; }
    .row + .row { margin-top: 14px; }
    .row .phone { width: 15%; } .row .tablet { width: 19%; }
    .row .phone-landscape { width: 34%; } .row .tablet-landscape { width: 36%; }
    .row .desktop { width: 52%; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 22px; }
    .grid2 .desktop .screen { max-height: 98mm; }
    figure { margin: 0; }
    .screen { border-radius: 14px; overflow: hidden; border: 6px solid #111214; background: #111214; box-shadow: 0 6px 18px rgb(0 0 0 / .18); }
    .phone .screen { border-radius: 26px; border-width: 7px; }
    .screen img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
    figcaption { margin-top: 6px; font-size: 12.5px; color: #4e5058; display: flex; flex-direction: column; gap: 1px; }
    figcaption b { color: #1e1f22; font-size: 14px; }
    figcaption em { font-style: normal; color: #4752c4; }
    table.req { width: 100%; border-collapse: collapse; font-size: 15px; }
    .req th, .req td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid #d4d7dc; }
    .req th { background: #f2f3f5; } .req td:first-child { width: 28%; font-weight: 600; }
    .lib-page .body { display: flex; flex-direction: column; gap: 10px; align-items: center; }
    img.lib { max-width: 100%; max-height: 100%; min-height: 0; flex: 0 1 auto; object-fit: contain; border-radius: 10px; }
  </style></head><body>${pages.join("\n")}</body></html>`;
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  const data = await seed();
  const shots = await capture(browser, data);
  const document = html(shots);
  const page = await browser.newPage();
  await page.setContent(document, { waitUntil: "load" });
  await page.pdf({ path: PDF, width: "420mm", height: "297mm", printBackground: true });
  if (process.env.PREVIEW_DIR) {
    mkdirSync(process.env.PREVIEW_DIR, { recursive: true });
    await page.emulateMedia({ media: "print" });
    const sheets = page.locator("section.page");
    for (let i = 0; i < (await sheets.count()); i++) {
      await sheets.nth(i).screenshot({ path: path.join(process.env.PREVIEW_DIR, `page-${i + 1}.png`) });
    }
  }
  console.log("wrote", path.relative(process.cwd(), PDF));
} finally {
  await browser.close();
}
