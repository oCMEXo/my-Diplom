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

/** Lets the test cut the page off from the sync server and let it back in. */
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
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Живые списки");
  const first = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}/files/${first.id}`);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}/files/${first.id}`);
  await expect(ownerPage.getByText("Синхронизировано")).toBeVisible();
  await expect(guestPage.getByText("Синхронизировано")).toBeVisible();

  const tree = (page: Page) => page.getByRole("link", { name: "заметка.py" });
  await guestPage.getByRole("button", { name: "Создать файл" }).click();
  await guestPage.getByLabel("Имя файла").fill("заметка.py");
  await guestPage.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(tree(ownerPage)).toBeVisible();

  // The dialog hands the keyboard over to the new file.
  await expect(guestPage.locator(".monaco-editor textarea").first()).toBeFocused();

  await ownerPage.getByRole("button", { name: "Удалить заметка.py" }).click({ force: true });
  await ownerPage.getByRole("dialog").getByRole("button", { name: /Удалить|В корзину/ }).click();
  await expect(tree(guestPage).first()).toBeHidden();

  await ownerPage.getByRole("tab", { name: /Участники/ }).click();
  const newcomer = await guest(request, "Новичок");
  await join(request, newcomer, project.inviteCode);
  await expect(ownerPage.getByLabel("Роль: Новичок")).toBeVisible();
});

test("a viewer is offered no invitation and a failed file creation stays in the dialog", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Роли");
  const file = await createFile(request, owner, project.id, "main.py");
  await setInviteRole(request, owner, project.id, "viewer");
  const viewer = await guest(request, "Зритель");
  await join(request, viewer, project.inviteCode);

  const viewerPage = await openAs(browser, viewer, `/projects/${project.id}/files/${file.id}`);
  await expect(viewerPage.getByText("только чтение")).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: /Пригласить/ })).toHaveCount(0);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await ownerPage.route("**/files", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({ status: 400, json: { message: "Проверьте введённые данные: что-то заполнено неверно." } });
  });
  await ownerPage.getByRole("button", { name: "Создать файл" }).click();
  const dialog = ownerPage.getByRole("dialog");
  await dialog.getByLabel("Имя файла").fill("плохое.py");
  await dialog.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Проверьте введённые данные");

  // Tab goes round inside the dialog, never to the page underneath.
  for (let press = 0; press < 12; press += 1) {
    await ownerPage.keyboard.press("Tab");
    expect(await ownerPage.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
});

test("a guest can keep the account, and is warned before leaving without it", async ({ browser, request }) => {
  const visitor = await guest(request, "Влад");
  const project = await createProject(request, visitor, "Гостевой проект");
  const page = await openAs(browser, visitor, "/");

  await page.getByRole("button", { name: "Меню профиля" }).click();
  await page.getByRole("menuitem", { name: "Выйти" }).click();
  const warning = page.getByRole("dialog", { name: "Выйти из гостевого аккаунта?" });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Сохранить аккаунт" }).click();

  const email = `${crypto.randomUUID()}@e2e.local`;
  const dialog = page.getByRole("dialog", { name: "Сохранить аккаунт" });
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Пароль").fill("password123");
  await dialog.getByRole("button", { name: "Сохранить" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Меню профиля" }).click();
  await expect(page.getByRole("menu").getByText("Аккаунт", { exact: true })).toBeVisible();

  const login = await request.post(`${API}/auth/login`, { data: { email, password: "password123" } });
  expect(login.ok()).toBe(true);
  const { tokens } = await login.json();
  const projects = await request.get(`${API}/projects`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  expect((await projects.json()).map((item: { id: string }) => item.id)).toContain(project.id);
});

test("an account can be deleted, and the privacy page is open to everyone", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Будет удалён");
  const page = await openAs(browser, owner, "/");

  await page.getByRole("button", { name: "Меню профиля" }).click();
  await page.getByRole("menuitem", { name: "Удалить аккаунт" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Пароль, чтобы подтвердить").fill("wrong-password");
  await dialog.getByRole("button", { name: "Удалить навсегда" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  const stillThere = await request.get(`${API}/projects/${project.id}`, {
    headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
  });
  expect(stillThere.ok()).toBe(true);

  await dialog.getByLabel("Пароль, чтобы подтвердить").fill("password123");
  await dialog.getByRole("button", { name: "Удалить навсегда" }).click();
  await expect(page).toHaveURL(/\/login/);

  const login = await request.post(`${API}/auth/login`, { data: { email: owner.user.email, password: "password123" } });
  expect(login.status()).toBe(401);

  await page.getByRole("link", { name: /данные и приватность/i }).first().click();
  await expect(page.getByRole("heading", { name: "Данные и приватность" })).toBeVisible();
});

test("following a participant goes to their file and keeps their cursor in view", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Следование");
  const first = await createFile(request, owner, project.id, "a.py");
  const second = await createFile(request, owner, project.id, "b.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const ownerPage = await openAs(browser, owner, `/projects/${project.id}/files/${first.id}`);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}/files/${first.id}`);
  await expect(guestPage.getByText("Синхронизировано")).toBeVisible();

  await guestPage.getByRole("button", { name: "Следить за: Аня" }).click();
  const bar = guestPage.getByRole("status").filter({ hasText: "Вы следите за" });
  await expect(bar).toContainText("Аня");

  await ownerPage.getByRole("link", { name: "b.py" }).first().click();
  await expect(guestPage).toHaveURL(new RegExp(`/files/${second.id}`));
  await expect(ownerPage.getByText("Синхронизировано")).toBeVisible();

  // A long file: the end is far below the first screen until the cursor of the person followed goes there.
  await typeInEditor(ownerPage, Array.from({ length: 50 }, (_, line) => `# ${line + 1}`).join("\n"));
  await expect.poll(() => editorText(guestPage), { timeout: 20_000 }).toContain("# 50");

  await guestPage.keyboard.press("Escape");
  await expect(bar).toBeHidden();
  await ownerPage.getByRole("link", { name: "a.py" }).first().click();
  await guestPage.waitForTimeout(500);
  await expect(guestPage).toHaveURL(new RegExp(`/files/${second.id}`));
});

test("a line can be shared in the chat and the link opens it for the others", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Ссылки");
  const file = await createFile(request, owner, project.id, "src/main.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, `/projects/${project.id}`);
  await expect(ownerPage.getByText("Синхронизировано")).toBeVisible();
  await typeInEditor(ownerPage, "один\nдва\nтри");

  await ownerPage.getByRole("button", { name: "Сослаться на эту строку в чате" }).click();
  const composer = ownerPage.getByLabel("Сообщение");
  await expect(composer).toHaveValue("src/main.py:3 ");
  await expect(composer).toBeFocused();
  await composer.pressSequentially("вот здесь");
  await composer.press("Enter");

  const link = guestPage.getByRole("link", { name: "src/main.py:3" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(guestPage).toHaveURL(new RegExp(`/files/${file.id}\\?line=3`));
});

test("messages missed while the chat was hidden are counted until it is opened", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Непрочитанное");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const page = await openAs(browser, visitor, `/projects/${project.id}/files/${file.id}`);
  await expect(page.getByText("Синхронизировано")).toBeVisible();
  await page.getByRole("tab", { name: /Участники/ }).click();

  const send = (body: string) =>
    request.post(`${API}/projects/${project.id}/messages`, {
      headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
      data: { body },
    });
  await send("первое");
  await send("второе");
  await expect(page.getByRole("tab", { name: "Чат 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Новых сообщений в чате: 2" })).toBeVisible();

  await page.getByRole("tab", { name: /Чат/ }).click();
  await expect(page.getByRole("button", { name: /Новых сообщений/ })).toHaveCount(0);
  await expect(page.getByText("второе")).toBeVisible();

  // With the panel closed the header button keeps counting, across a reload too.
  await page.getByRole("button", { name: "Скрыть чат и участников" }).click();
  await send("третье");
  await expect(page.getByRole("button", { name: "Новых сообщений в чате: 1" })).toBeVisible();
  await page.getByRole("button", { name: "Новых сообщений в чате: 1" }).click();
  await expect(page.getByText("третье")).toBeVisible();
  await expect(page.getByRole("button", { name: /Новых сообщений/ })).toHaveCount(0);
});

test("the project's text files can be downloaded as one archive", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Архив");
  const file = await createFile(request, owner, project.id, "src/main.py");
  await createFile(request, owner, project.id, "схема", "board");

  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await page.getByRole("button", { name: /действия с проектом/ }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Скачать ZIP" }).click()]);
  expect(download.suggestedFilename()).toBe("Архив.zip");

  const archive = await readFile(await download.path());
  expect(archive.subarray(0, 2).toString()).toBe("PK");
  expect(archive.includes("src/main.py")).toBe(true);
  expect(archive.includes("схема")).toBe(false);
});

test("edits made without a connection are merged after it returns", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Офлайн");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);
  await expect(ownerPage.getByText("Синхронизировано")).toBeVisible();
  await expect(guestPage.getByText("Синхронизировано")).toBeVisible();
  await typeInEditor(ownerPage, "начало");
  await expect.poll(() => editorText(guestPage)).toContain("начало");

  // Now the same page, but its connection can be cut.
  const connection = await controlSyncConnection(guestPage);
  await guestPage.reload();
  await expect(guestPage.getByText("Синхронизировано")).toBeVisible();
  await expect.poll(() => editorText(guestPage)).toContain("начало");

  await connection.cut();
  await expect(guestPage.getByText(/Офлайн|Подключение/).first()).toBeVisible();
  await guestPage.locator(".monaco-editor").first().click();
  await guestPage.keyboard.press("Control+End");
  await guestPage.keyboard.type(" гость");
  await ownerPage.locator(".monaco-editor").first().click();
  await ownerPage.keyboard.press("Control+Home");
  await ownerPage.keyboard.type("Аня ");
  await expect.poll(() => editorText(ownerPage)).toContain("Аня начало");
  expect(await editorText(ownerPage)).not.toContain("гость");

  connection.restore();
  // The label of a cursor breaks the rendered line in two for innerText, so spaces are compared loosely.
  const merged = async (page: Page) => (await editorText(page)).replace(/\s+/g, " ");
  await expect.poll(() => merged(ownerPage), { timeout: 30_000 }).toContain("Аня начало гость");
  await expect.poll(() => merged(guestPage), { timeout: 30_000 }).toContain("Аня начало гость");
});

test("reconnecting after the access token ran out gets a new one", async ({ browser, request }) => {
  test.setTimeout(90_000);
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Долгий перерыв");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  await expect(ownerPage.getByText("Синхронизировано")).toBeVisible();

  // Just outside the margin in which the app renews a token before connecting.
  const lifetime = 36;
  const started = Date.now();
  const context = await browser.newContext();
  const guestPage = await context.newPage();
  const connection = await controlSyncConnection(guestPage);
  const stored = JSON.stringify(withExpiringToken(visitor, lifetime));
  await guestPage.goto("/login");
  await guestPage.evaluate((value) => localStorage.setItem("collab.auth", value), stored);
  await guestPage.goto(path);
  await expect(guestPage.getByText("Синхронизировано")).toBeVisible();

  await connection.cut();
  await guestPage.locator(".monaco-editor").first().click();
  await guestPage.keyboard.type("после перерыва");
  await guestPage.waitForTimeout(lifetime * 1000 + 1000 - (Date.now() - started));

  connection.restore();
  await expect.poll(() => editorText(ownerPage), { timeout: 30_000 }).toContain("после перерыва");
});

test("a server hiccup during renewal keeps the session, and signing out reaches other tabs", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  await createProject(request, owner, "Сессия");
  const expired = withExpiringToken(owner, -60);

  const context = await browser.newContext();
  // Once only: every later page and reload must see the tokens the app has renewed by then.
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
  await expect(page.getByRole("link", { name: /Сессия/ })).toBeVisible();

  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("link", { name: /Сессия/ })).toBeVisible();
  await second.getByRole("button", { name: "Меню профиля" }).click();
  await second.getByRole("menuitem", { name: "Выйти" }).click();
  await expect(second).toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/login/);
});

test("a shape can be added, moved and deleted on the board with the keyboard alone", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Клавиатура");
  const file = await createFile(request, owner, project.id, "доска", "board");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  const board = page.locator("[data-shape-count]");
  await expect(board).toHaveAttribute("data-shape-count", "0");

  await page.getByRole("button", { name: "Прямоугольник" }).focus();
  await page.keyboard.press("Enter");
  await expect(board).toHaveAttribute("data-shape-count", "1");
  await expect(board).not.toHaveAttribute("data-selected-shape", "");
  const [x, y] = (await board.getAttribute("data-selected-shape"))!.split(",").map(Number);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(board).toHaveAttribute("data-selected-shape", `${x! + 20},${y! + 1}`);

  // The drawing leaves the board as a picture (US-12).
  for (const format of ["PNG", "SVG"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: format, exact: true }).click();
    expect((await download).suggestedFilename()).toBe(`доска.${format.toLowerCase()}`);
  }
  await board.focus();

  await page.keyboard.press("Escape");
  await expect(board).toHaveAttribute("data-selected-shape", "");
  await page.keyboard.press("]");
  await page.keyboard.press("Delete");
  await expect(board).toHaveAttribute("data-shape-count", "0");
  await page.context().close();
});

test("a shape can be drawn on the board with a finger", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Палец");
  const file = await createFile(request, owner, project.id, "доска", "board");

  const context = await browser.newContext({ hasTouch: true, viewport: { width: 900, height: 700 } });
  await context.addInitScript((stored) => {
    window.localStorage.setItem("collab.auth", stored);
  }, JSON.stringify({ user: owner.user, tokens: owner.tokens }));
  const page = await context.newPage();
  await page.goto(`/projects/${project.id}/files/${file.id}`);
  const count = page.locator("[data-shape-count]");
  await expect(count).toHaveAttribute("data-shape-count", "0");

  await page.getByRole("button", { name: "Прямоугольник" }).tap();
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("the board has no canvas");
  await page.touchscreen.tap(box.x + 200, box.y + 200);
  await expect(count).toHaveAttribute("data-shape-count", "1");
  await context.close();
});

test("a person registers, creates a project and signs in again through the pages", async ({ page }) => {
  const email = `${crypto.randomUUID()}@e2e.local`;
  await page.goto("/register");
  await page.getByLabel("Имя").fill("Аня");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill("password123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Создать проект" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").first().fill("Первый проект");
  await dialog.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/projects\//);

  await page.getByRole("button", { name: "Меню профиля" }).click();
  await page.getByRole("menuitem", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill("wrong-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Пароль").fill("password123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("link", { name: /Первый проект/ })).toBeVisible();
});

test("the cursor of another person is shown with a name, and a replaced link stops working", async ({ browser, request }) => {
  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Курсоры");
  const file = await createFile(request, owner, project.id, "main.py");
  const visitor = await guest(request, "Влад");
  await join(request, visitor, project.inviteCode);

  const path = `/projects/${project.id}/files/${file.id}`;
  const ownerPage = await openAs(browser, owner, path);
  const guestPage = await openAs(browser, visitor, path);
  await expect(guestPage.getByText("Синхронизировано")).toBeVisible();
  await typeInEditor(ownerPage, "x = 1");
  await expect.poll(() => editorText(guestPage)).toContain("x = 1");

  const cursor = guestPage.locator(".yRemoteSelectionHead").first();
  await expect(cursor).toBeAttached();
  // The name is written by a style rule that follows the awareness update.
  await expect.poll(() => cursor.evaluate((element) => getComputedStyle(element, "::after").content)).toContain("Аня");

  const regenerated = await request.post(`${API}/projects/${project.id}/invite/regenerate`, {
    headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
  });
  expect(regenerated.ok()).toBe(true);
  const stranger = await browser.newContext();
  const oldLink = await stranger.newPage();
  await oldLink.goto(`/join/${project.inviteCode}`);
  await expect(oldLink.getByText(/недействительна или устарела/)).toBeVisible();
  await stranger.close();
});

test("the keyboard-input hint explains a program that asks for input", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Аня");
  const project = await createProject(request, owner, "Ввод");
  const file = await createFile(request, owner, project.id, "main.py");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await expect(page.getByText("Синхронизировано")).toBeVisible();
  await typeInEditor(page, "input()");
  await page.getByRole("button", { name: "Запустить" }).click();
  await expect(page.getByText(/ждёт ввода с клавиатуры/)).toBeVisible({ timeout: 60_000 });
});
