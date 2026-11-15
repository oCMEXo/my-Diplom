import { expect, test, type Page } from "@playwright/test";
import { API, createFile, createProject, openAs, register } from "./helpers.js";

const MAIN_TEXT = "16px";
const SMALLEST_TEXT_PX = 12;
const LAPTOP = { width: 1280, height: 720 };
// The narrowest screen NFR-U2 promises to work on.
const PHONE = { width: 360, height: 760 };

/** Sizes of all the text on screen. The editor and the terminal have their own settings. */
function textSizes(page: Page) {
  return page.evaluate(() => {
    const sizes: number[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const element = walker.currentNode.parentElement;
      if (!walker.currentNode.textContent?.trim() || !element) continue;
      if (element.closest(".monaco-editor, .xterm, script, style, option")) continue;
      if (element.getBoundingClientRect().width > 1) sizes.push(parseFloat(getComputedStyle(element).fontSize));
    }
    return sizes;
  });
}

const fontSize = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).first().evaluate((element) => getComputedStyle(element).fontSize);

test("the interface keeps Discord's sizes, and its header fits on a laptop and a phone", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Sizes");
  const file = await createFile(request, owner, project.id, "src/main.py");
  await request.post(`${API}/projects/${project.id}/messages`, {
    headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
    data: { body: "A chat message" },
  });

  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await page.setViewportSize(LAPTOP);
  await expect(page.getByText("A chat message")).toBeVisible();

  expect(Math.min(...(await textSizes(page)))).toBeGreaterThanOrEqual(SMALLEST_TEXT_PX);
  expect(await fontSize(page, "main.py")).toBe(MAIN_TEXT);
  expect(await fontSize(page, "A chat message")).toBe(MAIN_TEXT);

  const run = page.getByRole("button", { name: "Run", exact: true });
  expect((await run.boundingBox())?.height).toBe(32);

  // Both side panels and the search leave the header little room: nothing may stick out of it.
  await page.getByRole("button", { name: /project actions/ }).click();
  await page.getByRole("menuitem", { name: /Search text/ }).click();
  const header = page.locator("main header");
  const overflow = () => header.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);

  await page.setViewportSize(PHONE);
  await page.getByRole("button", { name: "Close search" }).click();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.context().close();
});
