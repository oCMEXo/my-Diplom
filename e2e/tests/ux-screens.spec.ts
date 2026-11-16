import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createFile, createProject, openAs, register, setInviteRole } from "./helpers.js";

test.skip(process.env.UX_SCREENS !== "1", "UX screenshots are generated on demand");

const OUT = path.resolve(import.meta.dirname, "../../docs/ux/img");
const VIEWPORT = { width: 1280, height: 800 };
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

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

test("UX screens with errors and validation", async ({ browser, request }) => {
  test.setTimeout(180_000);
  const email = `${crypto.randomUUID()}@e2e.local`;
  await request.post("http://localhost:3101/auth/register", { data: { name: "Artem", email, password: "password123" } });
  const owner = await register(request, "Artem");
  const project = await createProject(request, owner, "Algorithms coursework");
  const code = await createFile(request, owner, project.id, "main.py");
  await createFile(request, owner, project.id, "utils.py");

  const anonymous = await browser.newContext({ viewport: VIEWPORT });
  const login = await anonymous.newPage();
  await login.goto("/login");
  await login.getByLabel("Email").fill(email);
  await login.getByLabel("Password").fill("wrong-password");
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(login.getByRole("alert")).toContainText("Wrong email or password");
  await shot(login, "01-login-error");
  await login.getByRole("alert").screenshot({ path: path.join(OUT, "c-error-note.png") });
  await login.getByRole("button", { name: "Sign in", exact: true }).screenshot({ path: path.join(OUT, "c-button-primary.png") });

  const signup = await anonymous.newPage();
  await signup.goto("/register");
  await signup.getByLabel("Name").fill("Vlad");
  await signup.getByLabel("Email").fill(email);
  await signup.getByLabel("Password").fill("password123");
  await signup.getByRole("button", { name: /Sign up|Create account/ }).click();
  await expect(signup.getByRole("alert")).toContainText("already registered");
  await shot(signup, "02-register-taken");
  await signup.getByLabel("Password").locator("..").screenshot({ path: path.join(OUT, "c-field-hint.png") });

  const invite = await anonymous.newPage();
  await invite.goto(`/join/${project.inviteCode}`);
  await expect(invite.getByText("invites you to the project")).toBeVisible();
  await expect(invite.getByRole("button", { name: /Join as guest/ })).toBeDisabled();
  await shot(invite, "03-join-empty-name");

  const broken = await anonymous.newPage();
  await broken.goto("/join/00000000000000000000000000000000");
  await expect(broken.getByText("Could not join")).toBeVisible();
  await shot(broken, "04-join-invalid");

  await setInviteRole(request, owner, project.id, "viewer");
  const viewer = await anonymous.newPage();
  await viewer.goto(`/join/${project.inviteCode}`);
  await expect(viewer.getByText("You will be able to view, but not change")).toBeVisible();
  await shot(viewer, "05-join-viewer");
  await setInviteRole(request, owner, project.id, "editor");
  await anonymous.close();

  const editor = await openAs(browser, owner, `/projects/${project.id}/files/${code.id}`);
  await editor.setViewportSize(VIEWPORT);
  const sync = await controlSyncConnection(editor);
  await editor.reload();
  await expect(editor.getByText("Synced")).toBeVisible();
  await editor.getByText("main.py").first().hover();
  await editor.getByRole("button", { name: "Rename main.py" }).click();
  await editor.getByLabel("New name").fill("utils.py");
  await expect(editor.getByRole("dialog").getByText("A file with this name already exists")).toBeVisible();
  await expect(editor.getByRole("button", { name: "Rename", exact: true })).toBeDisabled();
  await shot(editor, "06-rename-taken");
  await editor.getByRole("dialog").screenshot({ path: path.join(OUT, "c-modal.png") });
  await editor.keyboard.press("Escape");

  await editor.getByRole("button", { name: /project actions/ }).click();
  await editor.getByRole("menuitem", { name: /Import from GitHub/ }).click();
  await editor.getByLabel("Repository link").fill("github.com/just-a-page");
  await editor.getByRole("button", { name: "Import" }).click();
  await expect(editor.getByRole("dialog").getByRole("alert")).toBeVisible();
  await shot(editor, "07-import-invalid");
  await editor.keyboard.press("Escape");

  await editor.getByRole("button", { name: "Run", exact: true }).click();
  const runError = editor.getByText(/Running code is not available|turned off|Could not run/).first();
  if (await runError.isVisible({ timeout: 10_000 }).catch(() => false)) await shot(editor, "08-run-unavailable");

  await sync.cut();
  await expect(editor.getByText(/Offline|Connecting/).first()).toBeVisible({ timeout: 20_000 });
  await editor.locator(".monaco-editor").first().click();
  await editor.keyboard.type("print('written offline')");
  await shot(editor, "09-offline");
  await editor.getByRole("status").filter({ hasText: /Offline|Connecting/ }).first().screenshot({ path: path.join(OUT, "c-status-connection.png") });
  sync.restore();
  await expect(editor.getByText("Synced")).toBeVisible({ timeout: 30_000 });
  await shot(editor, "10-back-online");
});
