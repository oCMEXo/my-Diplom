import { expect, test } from "@playwright/test";

const BASE = process.env.LOAD_TIME_URL ?? "http://127.0.0.1:8787";
const API = `${BASE}/api`;
const FILES = 200;
const RUNS = 5;
const LIMIT_MS = 3000;
const TEN_MBIT_IN_BYTES = (10 * 1000 * 1000) / 8;

test(`a project of ${FILES} files opens within ${LIMIT_MS} ms over 10 Mbit/s (NFR-P2)`, async ({ browser, request }) => {
  const registered = await request.post(`${API}/auth/register`, {
    data: { name: "Timer", email: `${crypto.randomUUID()}@e2e.local`, password: "password123" },
  });
  const auth = await registered.json();
  const headers = { Authorization: `Bearer ${auth.tokens.accessToken}` };
  const project = await (await request.post(`${API}/projects`, { headers, data: { name: "Big project" } })).json();
  for (let number = 1; number <= FILES; number += 1) {
    const path = `src/module-${String(number).padStart(3, "0")}.py`;
    const created = await request.post(`${API}/projects/${project.id}/files`, { headers, data: { path, type: "code" } });
    expect(created.ok()).toBe(true);
  }

  const times: { tree: number; editor: number; bytes: number }[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const context = await browser.newContext(
      process.env.LOAD_TIME_UNCOMPRESSED ? { extraHTTPHeaders: { "Accept-Encoding": "identity" } } : {},
    );
    await context.addInitScript((stored) => {
      window.localStorage.setItem("collab.auth", stored);
    }, JSON.stringify({ user: auth.user, tokens: auth.tokens }));
    const page = await context.newPage();
    const network = await context.newCDPSession(page);
    await network.send("Network.enable");
    await network.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 40,
      downloadThroughput: TEN_MBIT_IN_BYTES,
      uploadThroughput: TEN_MBIT_IN_BYTES,
    });
    let bytes = 0;
    network.on("Network.loadingFinished", (event) => {
      bytes += event.encodedDataLength;
    });

    const started = Date.now();
    await page.goto(`${BASE}/projects/${project.id}`, { waitUntil: "commit" });
    await expect(page.getByRole("button", { name: "src" }).first()).toBeVisible({ timeout: 60_000 });
    const tree = Date.now() - started;
    await expect(page.locator(".monaco-editor .view-lines").first()).toBeVisible({ timeout: 60_000 });
    const editor = Date.now() - started;
    times.push({ tree, editor, bytes });
    await context.close();
  }

  for (const [index, time] of times.entries()) {
    console.log(`run ${index + 1}: file tree ${time.tree} ms, first file ${time.editor} ms, ${Math.round(time.bytes / 1024)} KiB by then`);
  }
  const sorted = times.map((time) => time.editor).sort((a, b) => a - b);
  console.log(`median ${sorted[Math.floor(RUNS / 2)]} ms, worst ${sorted[RUNS - 1]} ms`);
  expect(sorted[Math.floor(RUNS / 2)]).toBeLessThanOrEqual(LIMIT_MS);
});
