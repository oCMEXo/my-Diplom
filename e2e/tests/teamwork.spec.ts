import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  API,
  createFile,
  createProject,
  editorText,
  guest,
  join,
  openAs,
  register,
  setInviteRole,
  typeInEditor,
  withExpiringToken,
} from "./helpers.js";

async function controlSyncConnection(page: Page) {
  const sockets = new Set<{ close: () => Promise<void> }>();
  let blocked = false;
  await page.routeWebSocket(/:1334/, (socket) => {
    if (blocked) {
      void socket.close();
      return;
    }
    sockets.add(socket);
    socket.connectToServer();
  });
  return {
    cut: async () => {
      blocked = true;
      await Promise.all([...sockets].map((socket) => socket.close()));
      sockets.clear();
    },
    restore: () => {
      blocked = false;
    },
  };
}

test("a new file and a new member appear for everyone without a reload", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Live lists");
  const first = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}/files/${first.id}`);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}/files/${first.id}`);
  await expect(ownerPage.getByText("Synced")).toBeVisible();
  await expect(guestPage.getByText("Synced")).toBeVisible();

  const tree = (page: Page) => page.getByRole("link", { name: "note.py" });
  await guestPage.getByRole("button", { name: "Create a file" }).click();
  await guestPage.getByLabel("File name").fill("note.py");
  await guestPage.getByRole("button", { name: "Create", exact: true }).click();
  await expect(tree(ownerPage)).toBeVisible();

  await expect(guestPage.locator(".monaco-editor textarea").first()).toBeFocused();

  await tree(ownerPage).hover();
  await ownerPage.getByRole("button", { name: "Delete note.py" }).click();
  await ownerPage.getByRole("dialog").getByRole("button", { name: /Delete|Move to trash/ }).click();
  await expect(tree(guestPage).first()).toBeHidden();

  await ownerPage.getByRole("tab", { name: /Members/ }).click();
  const newcomer = await guest(request, "Newcomer");
  await join(request, newcomer, project.inviteCode);
  await expect(ownerPage.getByLabel("Role: Newcomer")).toBeVisible();
});

test("a viewer is offered no invitation and a failed file creation stays in the dialog", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Roles");
  const file = await createFile(request, owner, project.id, "main.py");
  await setInviteRole(request, owner, project.id, "viewer");
  const viewer = await guest(request, "Watcher");
  await join(request, viewer, project.inviteCode);

  const viewerPage = await openAs(browser, viewer, `/projects/${project.id}/files/${file.id}`);
  await expect(viewerPage.getByText("read only")).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: /Invite/ })).toHaveCount(0);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await ownerPage.route("**/files", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({ status: 400, json: { message: "Please check the form: some fields are not valid." } });
  });
  await ownerPage.getByRole("button", { name: "Create a file" }).click();
  const dialog = ownerPage.getByRole("dialog");
  await dialog.getByLabel("File name").fill("bad.py");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Please check the form");

  for (let press = 0; press < 12; press += 1) {
    await ownerPage.keyboard.press("Tab");
    expect(await ownerPage.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
});

test("a guest can keep the account, and is warned before leaving without it", async ({ browser, request }) => {
  const visitor = await guest(request, "Vlad");
  const project = await createProject(request, visitor, "Guest project");
  const page = await openAs(browser, visitor, "/");

  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  const warning = page.getByRole("dialog", { name: "Sign out of the guest account?" });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Save your account" }).click();

  const email = `${crypto.randomUUID()}@e2e.local`;
  const dialog = page.getByRole("dialog", { name: "Save your account" });
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill("password123");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Profile menu" }).click();
  await expect(page.getByRole("menu").getByText("Account", { exact: true })).toBeVisible();

  const login = await request.post(`${API}/auth/login`, { data: { email, password: "password123" } });
  expect(login.ok()).toBe(true);
  const { tokens } = await login.json();
  const projects = await request.get(`${API}/projects`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  expect((await projects.json()).map((item: { id: string }) => item.id)).toContain(project.id);
});

test("an account can be deleted, and the privacy page and the terms are open to everyone", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "To be deleted");
  const page = await openAs(browser, owner, "/");

  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Password to confirm").fill("wrong-password");
  await dialog.getByRole("button", { name: "Delete forever" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  const stillThere = await request.get(`${API}/projects/${project.id}`, {
    headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
  });
  expect(stillThere.ok()).toBe(true);

  await dialog.getByLabel("Password to confirm").fill("password123");
  await dialog.getByRole("button", { name: "Delete forever" }).click();
  await expect(page).toHaveURL(/\/login/);

  const login = await request.post(`${API}/auth/login`, { data: { email: owner.user.email, password: "password123" } });
  expect(login.status()).toBe(401);

  await page.getByRole("link", { name: /data and privacy/i }).first().click();
  await expect(page.getByRole("heading", { name: "Data and privacy" })).toBeVisible();
  await expect(page.getByText("A guest account that is in no project")).toBeVisible();

  await page.getByRole("link", { name: "Terms of use" }).click();
  await expect(page.getByRole("heading", { name: "Terms of use" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Running code" })).toBeVisible();
});

test("a new project can start from an example with a guide and code that is ready to run", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const page = await openAs(browser, owner, "/");

  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByRole("radio", { name: "With an example" }).click();
  await expect(page.getByLabel("Name")).toBeFocused();
  await page.getByLabel("Name").fill("First project");
  await page.getByRole("radio", { name: "JavaScript" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await page.getByRole("link", { name: "main.js" }).click();
  await expect.poll(() => editorText(page)).toContain("function fib(n)");
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible();
});

test("following a participant goes to their file and keeps their cursor in view", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Following");
  const first = await createFile(request, owner, project.id, "a.py");
  const second = await createFile(request, owner, project.id, "b.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}/files/${first.id}`);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}/files/${first.id}`);
  await expect(guestPage.getByText("Synced")).toBeVisible();

  await guestPage.getByRole("button", { name: "Follow Anna" }).click();
  const bar = guestPage.getByRole("status").filter({ hasText: "You are following" });
  await expect(bar).toContainText("Anna");

  await ownerPage.getByRole("link", { name: "b.py" }).first().click();
  await expect(guestPage).toHaveURL(new RegExp(`/files/${second.id}`));
  await expect(ownerPage.getByText("Synced")).toBeVisible();

  await typeInEditor(ownerPage, Array.from({ length: 50 }, (_, line) => `# ${line + 1}`).join("\n"));
  await expect.poll(() => editorText(guestPage), { timeout: 20_000 }).toContain("# 50");

  await guestPage.keyboard.press("Escape");
  await expect(bar).toBeHidden();
  await ownerPage.getByRole("link", { name: "a.py" }).first().click();
  await guestPage.waitForTimeout(500);
  await expect(guestPage).toHaveURL(new RegExp(`/files/${second.id}`));
});

test("a line can be shared in the chat and the link opens it for the others", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Links");
  const file = await createFile(request, owner, project.id, "src/main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}`);
  await expect(ownerPage.getByText("Synced")).toBeVisible();
  await typeInEditor(ownerPage, "one\ntwo\nthree");

  await ownerPage.getByRole("button", { name: "Mention this line in the chat" }).click();
  const composer = ownerPage.getByLabel("Message");
  await expect(composer).toHaveValue("src/main.py:3 ");
  await expect(composer).toBeFocused();
  await composer.pressSequentially("right here");
  await composer.press("Enter");

  const link = guestPage.getByRole("link", { name: "src/main.py:3" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(guestPage).toHaveURL(new RegExp(`/files/${file.id}\\?line=3`));
});

test("messages missed while the chat was hidden are counted until it is opened", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Unread");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const page = await openAs(browser, visitor, `/projects/${project.id}/files/${file.id}`);
  await expect(page.getByText("Synced")).toBeVisible();
  await page.getByRole("tab", { name: /Members/ }).click();

  const send = (body: string) =>
    request.post(`${API}/projects/${project.id}/messages`, {
      headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
      data: { body },
    });
  await send("first");
  await send("second");
  await expect(page.getByRole("tab", { name: "Chat 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New chat messages: 2" })).toBeVisible();

  await page.getByRole("tab", { name: /Chat/ }).click();
  await expect(page.getByRole("button", { name: /New chat messages/ })).toHaveCount(0);
  await expect(page.getByText("second")).toBeVisible();

  await page.getByRole("button", { name: "Hide chat and members" }).click();
  await send("third");
  await expect(page.getByRole("button", { name: "New chat messages: 1" })).toBeVisible();
  await page.getByRole("button", { name: "New chat messages: 1" }).click();
  await expect(page.getByText("third")).toBeVisible();
  await expect(page.getByRole("button", { name: /New chat messages/ })).toHaveCount(0);
});

test("the project's text files can be downloaded as one archive", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Archive");
  const file = await createFile(request, owner, project.id, "src/main.py");
  await createFile(request, owner, project.id, "diagram", "board");

  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await page.getByRole("button", { name: /project actions/ }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Download ZIP" }).click()]);
  expect(download.suggestedFilename()).toBe("Archive.zip");

  const archive = await readFile(await download.path());
  expect(archive.subarray(0, 2).toString()).toBe("PK");
  expect(archive.includes("src/main.py")).toBe(true);
  expect(archive.includes("diagram")).toBe(false);
});

test("edits made without a connection are merged after it returns", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Offline");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);
  await expect(ownerPage.getByText("Synced")).toBeVisible();
  await expect(guestPage.getByText("Synced")).toBeVisible();
  await typeInEditor(ownerPage, "start");
  await expect.poll(() => editorText(guestPage)).toContain("start");

  const connection = await controlSyncConnection(guestPage);
  await guestPage.reload();
  await expect(guestPage.getByText("Synced")).toBeVisible();
  await expect.poll(() => editorText(guestPage)).toContain("start");

  await connection.cut();
  await expect(guestPage.getByText(/Offline|Connecting/).first()).toBeVisible();
  await guestPage.locator(".monaco-editor").first().click();
  await guestPage.keyboard.press("Control+End");
  await guestPage.keyboard.type(" guest");
  await ownerPage.locator(".monaco-editor").first().click();
  await ownerPage.keyboard.press("Control+Home");
  await ownerPage.keyboard.type("Anna ");
  await expect.poll(() => editorText(ownerPage)).toContain("Anna start");
  expect(await editorText(ownerPage)).not.toContain("guest");

  connection.restore();
  const merged = async (page: Page) => (await editorText(page)).replace(/\s+/g, " ");
  await expect.poll(() => merged(ownerPage), { timeout: 30_000 }).toContain("Anna start guest");
  await expect.poll(() => merged(guestPage), { timeout: 30_000 }).toContain("Anna start guest");
});

test("reconnecting after the access token ran out gets a new one", async ({ browser, request }) => {
  test.setTimeout(90_000);
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Long break");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  await expect(ownerPage.getByText("Synced")).toBeVisible();

  const lifetime = 36;
  const started = Date.now();
  const context = await browser.newContext();
  const guestPage = await context.newPage();
  const connection = await controlSyncConnection(guestPage);
  const stored = JSON.stringify(withExpiringToken(visitor, lifetime));
  await guestPage.goto("/login");
  await guestPage.evaluate((value) => localStorage.setItem("collab.auth", value), stored);
  await guestPage.goto(path);
  await expect(guestPage.getByText("Synced")).toBeVisible();

  await connection.cut();
  await guestPage.locator(".monaco-editor").first().click();
  await guestPage.keyboard.type("after the break");
  await guestPage.waitForTimeout(lifetime * 1000 + 1000 - (Date.now() - started));

  connection.restore();
  await expect.poll(() => editorText(ownerPage), { timeout: 30_000 }).toContain("after the break");
});

test("a server hiccup during renewal keeps the session, and signing out reaches other tabs", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  await createProject(request, owner, "Session");
  const expired = withExpiringToken(owner, -60);

  const context = await browser.newContext();
  await context.addInitScript((value) => {
    if (!localStorage.getItem("e2e.seeded")) {
      localStorage.setItem("e2e.seeded", "1");
      localStorage.setItem("collab.auth", value);
    }
  }, JSON.stringify(expired));
  const page = await context.newPage();

  let refusals = 0;
  await page.route("**/auth/refresh", async (route) => {
    refusals += 1;
    await route.fulfill({ status: 502, body: "Bad Gateway" });
  });
  await page.goto("/");
  await expect.poll(() => refusals).toBeGreaterThan(0);
  await expect(page).not.toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem("collab.auth"))).not.toBeNull();

  await page.unroute("**/auth/refresh");
  await page.reload();
  await expect(page.getByRole("link", { name: /Session/ })).toBeVisible();

  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("link", { name: /Session/ })).toBeVisible();
  await second.getByRole("button", { name: "Profile menu" }).click();
  await second.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(second).toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/login/);
});

test("a shape can be added, moved and deleted on the board with the keyboard alone", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Keyboard");
  const file = await createFile(request, owner, project.id, "sketch", "board");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  const board = page.locator("[data-shape-count]");
  await expect(board).toHaveAttribute("data-shape-count", "0");

  await page.getByRole("button", { name: "Rectangle" }).focus();
  await page.keyboard.press("Enter");
  await expect(board).toHaveAttribute("data-shape-count", "1");
  await expect(board).not.toHaveAttribute("data-selected-shape", "");
  const [x, y] = (await board.getAttribute("data-selected-shape"))!.split(",").map(Number);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(board).toHaveAttribute("data-selected-shape", `${x! + 20},${y! + 1}`);

  for (const format of ["PNG", "SVG"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: format, exact: true }).click();
    expect((await download).suggestedFilename()).toBe(`sketch.${format.toLowerCase()}`);
  }
  await board.focus();

  await page.keyboard.press("Escape");
  await expect(board).toHaveAttribute("data-selected-shape", "");
  await page.keyboard.press("]");
  await page.keyboard.press("Delete");
  await expect(board).toHaveAttribute("data-shape-count", "0");
  await page.context().close();
});

test("the new-file dialog tells what happens to each language, and lists them all", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Languages");
  const page = await openAs(browser, owner, `/projects/${project.id}`);
  await page.getByRole("button", { name: "Create a file" }).click();

  const dialog = page.getByRole("dialog", { name: "New file" });
  const name = dialog.getByLabel("File name");
  const hint = dialog.getByRole("status");
  await name.fill("main.py");
  await expect(hint).toContainText("Python: highlighting and running");
  await name.fill("main.go");
  await expect(hint).toContainText("Go: highlighting. Only JavaScript, Python, C, C++ and Java can run");
  await name.fill("notes.xyz");
  await expect(hint).toContainText("The extension .xyz is unknown");
  await dialog.getByRole("button", { name: "Which languages are supported?" }).click();
  await expect(dialog.getByText("Solidity")).toBeVisible();

  await name.fill("main.go");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("button", { name: "Go: highlighting, no running" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run", exact: true })).toHaveCount(0);
  await page.context().close();
});

test("a shape can be drawn on the board with a finger", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Finger");
  const file = await createFile(request, owner, project.id, "sketch", "board");

  const context = await browser.newContext({ hasTouch: true, viewport: { width: 900, height: 700 } });
  await context.addInitScript((stored) => {
    window.localStorage.setItem("collab.auth", stored);
  }, JSON.stringify({ user: owner.user, tokens: owner.tokens }));
  const page = await context.newPage();
  await page.goto(`/projects/${project.id}/files/${file.id}`);
  const count = page.locator("[data-shape-count]");
  await expect(count).toHaveAttribute("data-shape-count", "0");

  await page.getByRole("button", { name: "Rectangle" }).tap();
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("the board has no canvas");
  await page.touchscreen.tap(box.x + 200, box.y + 200);
  await expect(count).toHaveAttribute("data-shape-count", "1");
  await context.close();
});

test("a person registers, creates a project and signs in again through the pages", async ({ page }) => {
  const email = `${crypto.randomUUID()}@e2e.local`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Anna");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Create a project" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").first().fill("First project");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/projects\//);

  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("link", { name: /First project/ })).toBeVisible();
});

test("the cursor of another person is shown with a name, and a replaced link stops working", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Cursors");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);
  await expect(guestPage.getByText("Synced")).toBeVisible();
  await typeInEditor(ownerPage, "x = 1");
  await expect.poll(() => editorText(guestPage)).toContain("x = 1");

  const cursor = guestPage.locator(".yRemoteSelectionHead").first();
  await expect(cursor).toBeAttached();
  await expect.poll(() => cursor.evaluate((element) => getComputedStyle(element, "::after").content)).toContain("Anna");

  const regenerated = await request.post(`${API}/projects/${project.id}/invite/regenerate`, {
    headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
  });
  expect(regenerated.ok()).toBe(true);
  const stranger = await browser.newContext();
  const oldLink = await stranger.newPage();
  await oldLink.goto(`/join/${project.inviteCode}`);
  await expect(oldLink.getByText(/not valid or has expired/)).toBeVisible();
  await stranger.close();
});

test("the keyboard-input hint explains a program that asks for input", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Input");
  const file = await createFile(request, owner, project.id, "main.py");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await expect(page.getByText("Synced")).toBeVisible();
  await typeInEditor(page, "input()");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText(/waits for keyboard input/)).toBeVisible({ timeout: 60_000 });
});
