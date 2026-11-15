import { expect, test } from "@playwright/test";
import {
  createFile,
  createProject,
  editorText,
  guest,
  importRepo,
  join,
  openAs,
  register,
  setInviteRole,
  typeInEditor,
} from "./helpers.js";

test("two people edit one file and see each other's changes live", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Shared project");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);
  await expect(ownerPage.getByText("Synced")).toBeVisible();
  await expect(guestPage.getByText("Synced")).toBeVisible();

  await typeInEditor(ownerPage, "x = 'from owner'");
  await expect.poll(() => editorText(guestPage)).toContain("from owner");

  await guestPage.keyboard.press("Control+End");
  await typeInEditor(guestPage, " # and guest");
  await expect.poll(() => editorText(ownerPage)).toContain("and guest");
  expect(await editorText(guestPage)).toBe(await editorText(ownerPage));
});

test("a read-only invite lets someone watch but not change the file", async ({
  browser,
  request,
}) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Read only");
  const file = await createFile(request, owner, project.id, "main.py");
  await setInviteRole(request, owner, project.id, "viewer");
  const watcher = await guest(request, "Watcher");
  await join(request, watcher, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const watcherPage = await openAs(browser, watcher, path);

  await typeInEditor(ownerPage, "print('visible to all')");
  await expect.poll(() => editorText(watcherPage)).toContain("visible to all");
  await expect(watcherPage.getByText("Read only").first()).toBeVisible();

  await watcherPage.locator(".monaco-editor").first().click();
  await watcherPage.keyboard.type("HACKED");
  await ownerPage.waitForTimeout(1500);
  expect(await editorText(ownerPage)).not.toContain("HACKED");
});

test("chat messages and presence reach everyone in the project", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Chat");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}`);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}`);

  await expect(ownerPage.getByTitle("online")).toHaveCount(2);

  await ownerPage.getByPlaceholder("Message...").fill("hello from e2e");
  await ownerPage.keyboard.press("Enter");
  await expect(guestPage.getByText("hello from e2e")).toBeVisible();
});

test("a markdown document renders a live preview for everyone", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Documents");
  const doc = await createFile(request, owner, project.id, "README.md", "doc");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${doc.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);

  await typeInEditor(ownerPage, "# Task title");
  await expect(guestPage.locator(".markdown-body h1")).toHaveText("Task title");
});

test("code run output is shared with everyone in the project", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Shared output");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);

  // Run output reaches others only over the live connection, so the guest must be connected before the run.
  await expect(guestPage.getByTitle("online")).toHaveCount(2);
  await typeInEditor(ownerPage, "print(6 * 7)");
  await ownerPage.getByRole("button", { name: "Run", exact: true }).click();

  await expect(guestPage.locator("pre")).toContainText("42", { timeout: 40_000 });
  await expect(ownerPage.locator("pre")).toContainText("42");
});

test("a shape drawn on the board appears for everyone and can be undone", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Board");
  const board = await createFile(request, owner, project.id, "ideas.board", "board");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${board.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);
  const ownerBoard = ownerPage.locator("[data-shape-count]");
  const guestBoard = guestPage.locator("[data-shape-count]");
  await expect(ownerBoard).toHaveAttribute("data-shape-count", "0");

  await ownerPage.getByRole("button", { name: "Rectangle" }).click();
  const canvas = ownerPage.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("board canvas is not visible");
  await ownerPage.mouse.move(box.x + 80, box.y + 80);
  await ownerPage.mouse.down();
  await ownerPage.mouse.move(box.x + 220, box.y + 180, { steps: 8 });
  await ownerPage.mouse.up();

  await expect(ownerBoard).toHaveAttribute("data-shape-count", "1");
  await expect(guestBoard).toHaveAttribute("data-shape-count", "1");

  await ownerPage.getByRole("button", { name: "Undo" }).click();
  await expect(guestBoard).toHaveAttribute("data-shape-count", "0");
});

test("a text label can be put on the board with one click", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Labels");
  const board = await createFile(request, owner, project.id, "plan.board", "board");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${board.id}`);
  const boardArea = page.locator("[data-shape-count]");
  await expect(boardArea).toHaveAttribute("data-shape-count", "0");

  await page.getByRole("button", { name: "Text" }).click();
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("board canvas is not visible");
  await page.mouse.click(box.x + 120, box.y + 120);
  // The text field must keep the focus after the click, or the empty label disappears at once.
  await expect(boardArea.locator("textarea")).toBeFocused();
  await page.keyboard.type("Database");
  await page.keyboard.press("Enter");
  await expect(boardArea).toHaveAttribute("data-shape-count", "1");
});

test("a file can be created from the sidebar and the theme choice is remembered", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Interface");
  const page = await openAs(browser, owner, `/projects/${project.id}`);

  await page.getByRole("button", { name: "Create a file" }).click();
  // The name field takes the focus, so one can start typing straight away.
  await expect(page.getByLabel("File name")).toBeFocused();
  await page.getByRole("radio", { name: "Document" }).click();
  await page.getByLabel("File name").fill("notes.md");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("link", { name: "notes.md" })).toBeVisible();
  await expect(page).toHaveURL(/\/files\//);

  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const before = await theme();
  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: /theme/ }).click();
  const after = await theme();
  expect(after).not.toBe(before);

  await page.reload();
  expect(await theme()).toBe(after);
});

test("a public GitHub repository can be imported into a new project", async ({ browser, request }) => {
  const github = await request.get("https://codeload.github.com/octocat/Hello-World/zip/HEAD").catch(() => null);
  test.skip(!github?.ok(), "needs network access to GitHub");

  const owner = await register(request, "Anna");
  const page = await openAs(browser, owner, "/");

  await page.getByRole("button", { name: "New project" }).first().click();
  await expect(page.getByLabel("Name")).toBeFocused();
  await page.getByRole("radio", { name: "From GitHub" }).click();
  await expect(page.getByLabel("Repository link")).toBeFocused();
  await page.getByLabel("Repository link").fill("https://github.com/octocat/Hello-World");
  await page.getByRole("button", { name: "Create and import" }).click();

  await expect(page).toHaveURL(/\/projects\//);
  const file = page.getByRole("link", { name: "README" });
  await expect(file).toBeVisible();
  await file.click();
  await expect(page.locator(".monaco-editor .view-lines")).toContainText("Hello World!");
});

test("a file can be deleted from the sidebar after confirmation", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Cleanup");
  await createFile(request, owner, project.id, "extra.py");
  const page = await openAs(browser, owner, `/projects/${project.id}`);

  const file = page.getByRole("link", { name: "extra.py" });
  await expect(file).toBeVisible();
  await file.hover();
  await page.getByRole("button", { name: "Delete extra.py" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await expect(file).toHaveCount(0);

  // The file is not gone: it waits in the trash and comes back with a click.
  await page.getByRole("button", { name: /Trash/ }).click();
  await page.getByRole("button", { name: "Restore extra.py" }).click();
  await expect(page.getByRole("link", { name: "extra.py" })).toBeVisible();
});

test("a wrong GitHub token is explained before anything is sent", async ({ browser, request }) => {
  const github = await request.get("https://api.github.com/zen").catch(() => null);
  test.skip(!github?.ok(), "needs network access to GitHub");

  const owner = await register(request, "Anna");
  const page = await openAs(browser, owner, "/");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByRole("radio", { name: "From GitHub" }).click();
  await page.getByLabel("Repository link").fill("https://github.com/octocat/Hello-World");
  await page.getByRole("button", { name: "Create and import" }).click();
  await expect(page.getByRole("link", { name: "README" })).toBeVisible();

  await page.getByRole("button", { name: /project actions/ }).click();
  await page.getByRole("menuitem", { name: /Push to GitHub/ }).click();
  await page.getByLabel("GitHub token").fill("ghp_definitely_not_a_real_token_0000");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("GitHub did not accept the token")).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole("button", { name: "Push", exact: true })).toBeDisabled();
});

test("files are shown in folders that can be folded", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Folders");
  await createFile(request, owner, project.id, "package.json");
  await createFile(request, owner, project.id, "contracts/Lock.sol");
  await createFile(request, owner, project.id, "logs/2025/run.log");
  const page = await openAs(browser, owner, `/projects/${project.id}`);

  await expect(page.getByRole("button", { name: "contracts", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lock.sol" })).toBeVisible();
  await expect(page.getByRole("link", { name: "run.log" })).toBeVisible();

  await page.getByRole("button", { name: "contracts", exact: true }).click();
  await expect(page.getByRole("link", { name: "Lock.sol" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "package.json" })).toBeVisible();
});

test("a project can be deleted by its owner and left by a guest", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Old project");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const guestPage = await openAs(browser, visitor, "/");
  await expect(guestPage.getByText("Old project")).toBeVisible();
  await guestPage.getByText("Old project").hover();
  await guestPage.getByRole("button", { name: "Leave project Old project" }).click();
  await guestPage.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(guestPage.getByText("Old project")).toHaveCount(0);

  const ownerPage = await openAs(browser, owner, "/");
  await ownerPage.getByText("Old project").hover();
  await ownerPage.getByRole("button", { name: "Delete project Old project" }).click();
  await ownerPage.getByRole("button", { name: "Delete forever" }).click();
  await expect(ownerPage.getByText("Old project")).toHaveCount(0);
});

test("code run can import other files of the project", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Modules");
  const helper = await createFile(request, owner, project.id, "logger.js");
  const main = await createFile(request, owner, project.id, "main.js");

  const helperPage = await openAs(browser, owner, `/projects/${project.id}/files/${helper.id}`);
  await typeInEditor(helperPage, "module.exports = (text) => console.log('[log] ' + text);");
  await expect(helperPage.getByText("Synced")).toBeVisible();
  await helperPage.waitForTimeout(3500);

  const page = await openAs(browser, owner, `/projects/${project.id}/files/${main.id}`);
  await typeInEditor(page, "require('./logger')('hello');");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator("pre")).toContainText("[log] hello", { timeout: 40_000 });
});

test("an invite link shows where it leads and lets a guest choose a name", async ({ browser, request }) => {
  const owner = await register(request, "Artem");
  const project = await createProject(request, owner, "Coursework");

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/join/${project.inviteCode}`);

  await expect(page.getByText("Artem invites you to the project")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coursework" })).toBeVisible();
  await page.getByLabel("What is your name?").fill("Vlad");
  await page.getByRole("button", { name: "Join as guest" }).click();

  await expect(page).toHaveURL(/\/projects\//);
  await page.getByRole("tab", { name: /Members/ }).click();
  // In the member list: the name is also on the user card at the bottom of the sidebar.
  await expect(page.getByRole("listitem").filter({ hasText: "you" })).toContainText("Vlad");
  await context.close();
});

test("an unknown invite link and an unreachable project explain themselves", async ({ browser, request }) => {
  const owner = await register(request, "Anna");

  const stranger = await browser.newContext();
  const invite = await stranger.newPage();
  await invite.goto("/join/definitely-not-a-code");
  await expect(invite.getByText("The invite link is not valid or has expired")).toBeVisible();
  await stranger.close();

  const page = await openAs(browser, owner, "/projects/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "The project is not available" })).toBeVisible();
  await expect(page.getByRole("link", { name: "To my projects" })).toBeVisible();
});

test("the owner can change a member's role and remove them", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Team");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const page = await openAs(browser, owner, `/projects/${project.id}`);
  await page.getByRole("tab", { name: /Members/ }).click();

  await page.getByLabel("Role: Vlad").selectOption("viewer");
  await expect(page.getByLabel("Role: Vlad")).toHaveValue("viewer");

  await page.getByText("Vlad", { exact: true }).hover();
  await page.getByRole("button", { name: "Remove from the project: Vlad" }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Vlad", { exact: true })).toHaveCount(0);
});

test("a member demoted or removed while working sees it at once", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Live rights");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Vlad");
  await join(request, visitor, project.inviteCode);

  const guestPage = await openAs(browser, visitor, `/projects/${project.id}/files/${file.id}`);
  await expect(guestPage.getByText("Synced")).toBeVisible();

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}`);
  await ownerPage.getByRole("tab", { name: /Members/ }).click();
  await ownerPage.getByLabel("Role: Vlad").selectOption("viewer");
  await expect(guestPage.getByText("Read only").first()).toBeVisible();

  await ownerPage.getByText("Vlad", { exact: true }).hover();
  await ownerPage.getByRole("button", { name: "Remove from the project: Vlad" }).click();
  await ownerPage.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(guestPage.getByText("You were removed from the project “Live rights”.")).toBeVisible();
  await expect(guestPage).toHaveURL(/\/$/);
});

test("a person can change the name others see", async ({ browser, request }) => {
  const visitor = await guest(request, "Guest");
  const page = await openAs(browser, visitor, "/");

  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Change name" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Vlad");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "Hi, Vlad" })).toBeVisible();
});

test("a file can be found with Ctrl+P and renamed from the sidebar", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Search");
  await createFile(request, owner, project.id, "scripts/deployLock.js");
  await createFile(request, owner, project.id, "contracts/Greeter.sol");
  const page = await openAs(browser, owner, `/projects/${project.id}`);
  await expect(page.getByRole("link", { name: "Greeter.sol" })).toBeVisible();

  await page.keyboard.press("Control+p");
  await page.getByLabel("File name").fill("dlock");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/files\//);
  await expect(page.getByRole("heading", { name: "scripts/deployLock.js" })).toBeVisible();

  await page.getByRole("link", { name: "deployLock.js" }).hover();
  await page.getByRole("button", { name: "Rename scripts/deployLock.js" }).click();
  await page.getByLabel("New name").fill("scripts/deploy.js");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.getByRole("link", { name: "deploy.js", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "scripts/deploy.js" })).toBeVisible();
});

test("a project that has files opens on one of them, and the tab title names it", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Start");
  await createFile(request, owner, project.id, "notes.md", "doc");
  await createFile(request, owner, project.id, "README.md", "doc");
  const page = await openAs(browser, owner, `/projects/${project.id}`);

  await expect(page).toHaveURL(/\/files\//);
  await expect(page.getByRole("heading", { name: "README.md" })).toBeVisible();
  await expect(page).toHaveTitle(/README\.md · Start/);
});

test("opened files become tabs that can be switched and closed", async ({ browser, request }) => {
  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Tabs");
  const first = await createFile(request, owner, project.id, "one.md", "doc");
  await createFile(request, owner, project.id, "two.md", "doc");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${first.id}`);
  const strip = page.getByRole("tablist", { name: "Open files" });

  // One open file needs no tab strip.
  await expect(strip.getByRole("tab")).toHaveCount(0);

  await page.getByRole("link", { name: "two.md" }).click();
  await expect(strip.getByRole("tab")).toHaveCount(2);
  await expect(strip.getByRole("tab", { name: "two.md" })).toHaveAttribute("aria-selected", "true");

  await strip.getByRole("tab", { name: "one.md" }).click();
  await expect(strip.getByRole("tab", { name: "one.md" })).toHaveAttribute("aria-selected", "true");

  await strip.getByRole("tab", { name: "one.md" }).hover();
  await page.getByRole("button", { name: "Close tab one.md" }).click();
  await expect(page.getByRole("heading", { name: "two.md" })).toBeVisible();
  await expect(strip.getByRole("tab")).toHaveCount(0);
});

test("switching the repository branch changes the files for everyone in the project", async ({ browser, request }) => {
  const github = await request.get("https://api.github.com/repos/octocat/Spoon-Knife/branches").catch(() => null);
  test.skip(!github?.ok(), "needs network access to GitHub");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Fork and spoon");
  await importRepo(request, owner, project.id, "https://github.com/octocat/Spoon-Knife");
  const friend = await guest(request, "Bob");
  await join(request, friend, project.inviteCode);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}`);
  const friendPage = await openAs(browser, friend, `/projects/${project.id}`);
  await expect(friendPage.getByRole("link", { name: "index.html" })).toBeVisible();
  await expect(friendPage.getByRole("link", { name: "test.md" })).toHaveCount(0);

  await ownerPage.getByRole("button", { name: /project actions/ }).click();
  await ownerPage.getByRole("menuitem", { name: /Branch/ }).click();
  const dialog = ownerPage.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /^main/ })).toHaveAttribute("aria-current", "true");
  await dialog.getByRole("button", { name: /^test-branch/ }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  // The other person did nothing: their sidebar follows the switch.
  await expect(friendPage.getByRole("link", { name: "test.md" })).toBeVisible();
  // Both land on a file of the new branch, not on the old branch's README that no longer exists here.
  for (const page of [ownerPage, friendPage]) {
    await expect(page.getByRole("heading", { name: "README.md" })).toBeVisible();
    await expect(page.getByText("File not found")).toHaveCount(0);
  }
  await friendPage.getByRole("button", { name: /project actions/ }).click();
  await expect(friendPage.getByRole("menuitem", { name: /Branch/ })).toContainText("test-branch");
  await friendPage.keyboard.press("Escape");

  await ownerPage.getByRole("button", { name: /project actions/ }).click();
  await ownerPage.getByRole("menuitem", { name: /Branch/ }).click();
  await ownerPage.getByRole("dialog").getByRole("button", { name: /^main/ }).click();
  await expect(friendPage.getByRole("link", { name: "test.md" })).toHaveCount(0);
  await expect(friendPage.getByRole("link", { name: "index.html" })).toBeVisible();
});

test("an endless program is stopped with the Stop button, for everyone", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Loop");
  const file = await createFile(request, owner, project.id, "loop.js");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await typeInEditor(page, "while (true) {}");

  await page.getByRole("button", { name: "Run", exact: true }).click();
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await expect(stop).toBeVisible({ timeout: 30_000 });
  await stop.click();
  await expect(page.getByRole("status").filter({ hasText: "stopped" })).toBeVisible({ timeout: 15_000 });
  // The runner's own clock, without the trip to the browser: a run the 10-second limit
  // ended would have lasted 10 s or more.
  const duration = await page.getByRole("button", { name: /^Output · [\d.]+ s$/ }).textContent();
  expect(Number(duration?.match(/([\d.]+) s/)?.[1])).toBeLessThan(10);
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible();
  await page.context().close();
});

test("the terminal runs the project's files in a sandbox, like Git Bash", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "Sandbox");
  const file = await createFile(request, owner, project.id, "main.js");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await typeInEditor(page, "console.log('answer', 6 * 7)");
  // The sync server saves edits within three seconds; the terminal copies the saved files.
  await page.waitForTimeout(3500);

  await page.getByRole("button", { name: "Terminal" }).click();
  const terminal = page.getByRole("region", { name: "Terminal" });
  const screen = terminal.locator(".xterm-rows");
  await expect(screen).toContainText("Anna@collab", { timeout: 60_000 });

  await terminal.locator(".xterm-helper-textarea").focus();
  await page.keyboard.type("ls && node main.js");
  await page.keyboard.press("Enter");
  await expect(screen).toContainText("answer 42", { timeout: 20_000 });
  await expect(screen).toContainText("main.js");

  // An endless program stops with the button, as with Ctrl+C: a phone has no Ctrl key.
  await page.keyboard.type('node -e "while(true){}"');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await terminal.getByRole("button", { name: /Stop the program/ }).click();
  await page.keyboard.type("echo $((6*7))done");
  await page.keyboard.press("Enter");
  await expect(screen).toContainText("42done", { timeout: 10_000 });

  // Ctrl+` closes it, and the session ends with the panel.
  await page.keyboard.press("Control+Backquote");
  await expect(terminal).toBeHidden();
});
