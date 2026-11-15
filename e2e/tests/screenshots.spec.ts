import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { API, createFile, createProject, guest, join, openAs, register, typeInEditor } from "./helpers.js";

// Produces the interface screenshots used in the thesis:
//   SCREENSHOTS=1 pnpm --filter @collab/e2e e2e -- screenshots
test.skip(process.env.SCREENSHOTS !== "1", "documentation screenshots are generated on demand");

const OUT = path.resolve(import.meta.dirname, "../../docs/thesis/screenshots");
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

test("interface screenshots", async ({ browser, request }) => {
  test.setTimeout(180_000);
  const owner = await register(request, "Artem");
  const project = await createProject(request, owner, "Algorithms coursework");
  await createProject(request, owner, "Landing page design");
  const code = await createFile(request, owner, project.id, "main.py");
  await createFile(request, owner, project.id, "src/utils.ts");
  const doc = await createFile(request, owner, project.id, "README.md", "doc");
  const board = await createFile(request, owner, project.id, "architecture.board", "board");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);
  for (const [who, body] of [
    [owner, "Hi! I pushed a first draft, see main.py"],
    [visitor, "Great, I will look now"],
    [visitor, "Did we already make a board for the diagram?"],
    [owner, "Yes, “architecture.board”. We draw there"],
  ] as const) {
    await request.post(`${API}/projects/${project.id}/messages`, {
      headers: { Authorization: `Bearer ${who.tokens.accessToken}` },
      data: { body },
    });
  }

  const ctx = { viewport: { width: 1440, height: 900 } };
  const fresh = await browser.newContext(ctx);
  const loginPage = await fresh.newPage();
  await loginPage.goto("/login");
  await expect(loginPage.getByText("Welcome back")).toBeVisible();
  await shot(loginPage, "01-login");
  await fresh.close();

  const open = async (auth: typeof owner, url: string) => {
    const page = await openAs(browser, auth, url);
    await page.setViewportSize(ctx.viewport);
    return page;
  };

  const home = await open(owner, "/");
  await expect(home.getByText("Algorithms coursework")).toBeVisible();
  await shot(home, "02-projects");

  const codePath = `/projects/${project.id}/files/${code.id}`;
  const ownerPage = await open(owner, codePath);
  const guestPage = await open(visitor, codePath);
  await expect(ownerPage.getByText("Synced")).toBeVisible();
  // Pasted, not typed: the editor's auto-indent would add to the indents in the text.
  await ownerPage.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await ownerPage.evaluate(
    (text) => navigator.clipboard.writeText(text),
    "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])",
  );
  await ownerPage.locator(".monaco-editor").first().click();
  await ownerPage.keyboard.press("Control+V");
  await expect(guestPage.locator(".view-lines")).toContainText("print");
  await guestPage.locator(".monaco-editor").first().click();
  await guestPage.keyboard.press("Control+End");
  await guestPage.keyboard.type("  # checked");
  await ownerPage.waitForTimeout(1200);
  await shot(ownerPage, "03-editor");

  await ownerPage.getByRole("button", { name: /project actions/ }).click();
  await ownerPage.getByRole("menuitem", { name: /Invite/ }).click();
  await ownerPage.waitForTimeout(400);
  await shot(ownerPage, "06-invite");
  await ownerPage.keyboard.press("Escape");

  const docPage = await open(owner, `/projects/${project.id}/files/${doc.id}`);
  await typeInEditor(
    docPage,
    "# Algorithms coursework\n\nWe work on the **task** together: sorting algorithms.\n\n## Plan\n- Write `fib`\n- Estimate the complexity\n- Draw the diagram on the board\n\n> Everyone sees every edit at once.",
  );
  await docPage.waitForTimeout(800);
  await shot(docPage, "04-markdown");

  const boardPage = await open(owner, `/projects/${project.id}/files/${board.id}`);
  const canvas = boardPage.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("board canvas is not visible");
  const draw = async (tool: string, from: [number, number], to: [number, number], swatch?: string) => {
    if (swatch) {
      // Picking a color recolors the selected shape, so deselect before choosing the next one.
      await boardPage.getByRole("button", { name: "Select" }).click();
      await boardPage.mouse.click(box.x + 40, box.y + 600);
      await boardPage.getByRole("button", { name: swatch }).click();
    }
    await boardPage.getByRole("button", { name: tool }).click();
    await boardPage.mouse.move(box.x + from[0], box.y + from[1]);
    await boardPage.mouse.down();
    await boardPage.mouse.move(box.x + to[0], box.y + to[1], { steps: 6 });
    await boardPage.mouse.up();
  };
  await draw("Rectangle", [90, 90], [300, 170], "Colour 2 of");
  await draw("Rectangle", [90, 300], [300, 380], "Colour 3 of");
  await draw("Ellipse", [520, 190], [720, 290], "Colour 1 of");
  await draw("Arrow", [305, 130], [515, 235], "Colour 2 of");
  await draw("Arrow", [305, 340], [515, 250], "Colour 3 of");
  await boardPage.waitForTimeout(500);
  await shot(boardPage, "05-board");

  await ownerPage.getByRole("button", { name: "Profile menu" }).click();
  await ownerPage.getByRole("menuitem", { name: /theme/ }).click();
  await ownerPage.keyboard.press("Escape");
  await ownerPage.waitForTimeout(500);
  await shot(ownerPage, "07-light-theme");

  const invited = await browser.newContext(ctx);
  const invitePage = await invited.newPage();
  await invitePage.goto(`/join/${project.inviteCode}`);
  await expect(invitePage.getByText("invites you to the project")).toBeVisible();
  await shot(invitePage, "10-invite-landing");
  await invited.close();

  const importPage = await open(owner, `/projects/${project.id}`);
  await importPage.getByRole("button", { name: /project actions/ }).click();
  await importPage.getByRole("menuitem", { name: /Import from GitHub/ }).click();
  await importPage.getByLabel("Repository link").fill("https://github.com/octocat/Hello-World");
  await importPage.waitForTimeout(300);
  await shot(importPage, "09-import-github");

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobile.addInitScript((stored) => {
    window.localStorage.setItem("collab.auth", stored);
  }, JSON.stringify({ user: owner.user, tokens: owner.tokens }));
  const phone = await mobile.newPage();
  await phone.goto(`/projects/${project.id}/files/${doc.id}`);
  await phone.waitForTimeout(2000);
  await shot(phone, "08-mobile");
  await mobile.close();
});
