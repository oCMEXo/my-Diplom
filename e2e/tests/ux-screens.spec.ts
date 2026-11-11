import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createFile, createProject, openAs, register, setInviteRole } from "./helpers.js";

// Screens with errors and validation for the UX specification (docs/ux):
//   UX_SCREENS=1 pnpm --filter @collab/e2e e2e -- ux-screens
test.skip(process.env.UX_SCREENS !== "1", "UX screenshots are generated on demand");

const OUT = path.resolve(import.meta.dirname, "../../docs/ux/img");
const VIEWPORT = { width: 1280, height: 800 };
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

/** Cuts the page off from the sync server and lets it back in (as in teamwork.spec.ts). */
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
  await request.post("http://localhost:3101/auth/register", { data: { name: "Артём", email, password: "password123" } });
  const owner = await register(request, "Артём");
  const project = await createProject(request, owner, "Курсовая по алгоритмам");
  const code = await createFile(request, owner, project.id, "main.py");
  await createFile(request, owner, project.id, "utils.py");

  // 1. Sign-in with a wrong password: one message that does not say which field is wrong.
  const anonymous = await browser.newContext({ viewport: VIEWPORT });
  const login = await anonymous.newPage();
  await login.goto("/login");
  await login.getByLabel("Email").fill(email);
  await login.getByLabel("Пароль").fill("wrong-password");
  await login.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(login.getByRole("alert")).toContainText("Неверный email или пароль");
  await shot(login, "01-login-error");
  await login.getByRole("alert").screenshot({ path: path.join(OUT, "c-error-note.png") });
  await login.getByRole("button", { name: "Войти", exact: true }).screenshot({ path: path.join(OUT, "c-button-primary.png") });

  // 2. Registration with an address that already has an account; the password rule is shown as a hint.
  const signup = await anonymous.newPage();
  await signup.goto("/register");
  await signup.getByLabel("Имя").fill("Влад");
  await signup.getByLabel("Email").fill(email);
  await signup.getByLabel("Пароль").fill("password123");
  await signup.getByRole("button", { name: /Зарегистрироваться|Создать аккаунт/ }).click();
  await expect(signup.getByRole("alert")).toContainText("уже зарегистрирован");
  await shot(signup, "02-register-taken");
  await signup.getByLabel("Пароль").locator("..").screenshot({ path: path.join(OUT, "c-field-hint.png") });

  // 3. Invitation: the guest form; the button stays off until a name is typed.
  const invite = await anonymous.newPage();
  await invite.goto(`/join/${project.inviteCode}`);
  await expect(invite.getByText("приглашает вас в проект")).toBeVisible();
  await expect(invite.getByRole("button", { name: /Присоединиться как гость/ })).toBeDisabled();
  await shot(invite, "03-join-empty-name");

  // 4. A link that is wrong or was replaced.
  const broken = await anonymous.newPage();
  await broken.goto("/join/00000000000000000000000000000000");
  await expect(broken.getByText("Не получилось присоединиться")).toBeVisible();
  await shot(broken, "04-join-invalid");

  // 5. A link that gives only the right to read.
  await setInviteRole(request, owner, project.id, "viewer");
  const viewer = await anonymous.newPage();
  await viewer.goto(`/join/${project.inviteCode}`);
  await expect(viewer.getByText("Вы сможете смотреть, но не менять")).toBeVisible();
  await shot(viewer, "05-join-viewer");
  await setInviteRole(request, owner, project.id, "editor");
  await anonymous.close();

  // 6. Renaming a file to a name that is taken: the form says so while typing and keeps the button off.
  const editor = await openAs(browser, owner, `/projects/${project.id}/files/${code.id}`);
  await editor.setViewportSize(VIEWPORT);
  const sync = await controlSyncConnection(editor);
  await editor.reload();
  await expect(editor.getByText("Синхронизировано")).toBeVisible();
  await editor.getByText("main.py").first().hover();
  await editor.getByRole("button", { name: "Переименовать main.py" }).click();
  await editor.getByLabel("Новое имя").fill("utils.py");
  await expect(editor.getByRole("dialog").getByText("Файл с таким именем уже есть")).toBeVisible();
  await expect(editor.getByRole("button", { name: "Переименовать", exact: true })).toBeDisabled();
  await shot(editor, "06-rename-taken");
  await editor.getByRole("dialog").screenshot({ path: path.join(OUT, "c-modal.png") });
  await editor.keyboard.press("Escape");

  // 7. Import from GitHub with a link that is not a repository.
  await editor.getByRole("button", { name: /действия с проектом/ }).click();
  await editor.getByRole("menuitem", { name: /Импорт из GitHub/ }).click();
  await editor.getByLabel("Ссылка на репозиторий").fill("github.com/just-a-page");
  await editor.getByRole("button", { name: "Импортировать" }).click();
  // Monaco has its own empty role="alert" regions, so look inside the dialog.
  await expect(editor.getByRole("dialog").getByRole("alert")).toBeVisible();
  await shot(editor, "07-import-invalid");
  await editor.keyboard.press("Escape");

  // 8. Running code when the code runner is not available.
  await editor.getByRole("button", { name: "Запустить" }).click();
  const runError = editor.getByText(/Запуск кода сейчас недоступен|выключен|Не удалось запустить/).first();
  if (await runError.isVisible({ timeout: 10_000 }).catch(() => false)) await shot(editor, "08-run-unavailable");

  // 9. The connection stops: the header says that edits are kept on this device.
  await sync.cut();
  // While the provider tries to reconnect, the header says "Подключение…"; between tries, "Офлайн".
  await expect(editor.getByText(/Офлайн|Подключение/).first()).toBeVisible({ timeout: 20_000 });
  await editor.locator(".monaco-editor").first().click();
  await editor.keyboard.type("print('written offline')");
  await shot(editor, "09-offline");
  await editor.getByRole("status").filter({ hasText: /Офлайн|Подключение/ }).first().screenshot({ path: path.join(OUT, "c-status-connection.png") });
  sync.restore();
  await expect(editor.getByText("Синхронизировано")).toBeVisible({ timeout: 30_000 });
  await shot(editor, "10-back-online");
});
