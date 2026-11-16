import { expect, test } from "@playwright/test";
import { createFile, createProject, editorText, openAs, register, typeInEditor } from "./helpers.js";

test("a teacher starts a class, a guest student gets their own copy, and the teacher sees them", async ({ browser, request }) => {
  const teacher = await register(request, "Teacher");
  const task = await createProject(request, teacher, "Loops");
  const file = await createFile(request, teacher, task.id, "main.py");

  const teacherPage = await openAs(browser, teacher, `/projects/${task.id}/files/${file.id}`);
  await expect(teacherPage.getByText("Synced")).toBeVisible();
  await typeInEditor(teacherPage, "# TODO: print the sum of 1..10");
  // The sync server stores the text within three seconds; the copy is made from the stored text.
  await teacherPage.waitForTimeout(3500);

  await teacherPage.getByRole("button", { name: /project actions/ }).click();
  await teacherPage.getByRole("menuitem", { name: "Class for students" }).click();
  await expect(teacherPage.getByRole("heading", { name: "Loops" })).toBeVisible();
  await expect(teacherPage.getByText("No students yet")).toBeVisible();
  const link = await teacherPage.getByLabel("Class link").inputValue();
  expect(link).toMatch(/\/class\/[\w-]+$/);

  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  await student.goto(new URL(link).pathname);
  await expect(student.getByText("Teacher invites you to the class")).toBeVisible();
  await student.getByLabel("What is your name?").fill("Vlad");
  await student.getByRole("button", { name: "Join the class" }).click();
  await expect(student).toHaveURL(/\/projects\/[\w-]+/);
  await student.getByRole("link", { name: "main.py" }).click();
  await expect.poll(() => editorText(student)).toContain("TODO: print the sum of 1..10");

  await teacherPage.reload();
  await expect(teacherPage.getByText("Students · 1")).toBeVisible();
  await teacherPage.getByRole("button", { name: "Open the copy of Vlad" }).click();
  await expect(teacherPage).toHaveURL(/\/projects\/[\w-]+/);
  await expect(teacherPage.getByRole("button", { name: /Loops: Vlad: project actions/ })).toBeVisible();

  // The copies stay out of the teacher's project list; the class is listed instead.
  await teacherPage.goto("/");
  await expect(teacherPage.getByRole("heading", { name: "Your classes" })).toBeVisible();
  await expect(teacherPage.getByText("Loops: Vlad")).toHaveCount(0);
  await studentContext.close();
});

test("the sign-in page leads to a password reset that does not reveal accounts", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.getByLabel("Email").fill(`nobody-${crypto.randomUUID()}@e2e.local`);
  await page.getByRole("button", { name: "Send the link" }).click();
  await expect(page.getByText("If an account with this email exists, the link is on its way.")).toBeVisible();

  await page.goto("/reset-password?token=not-a-real-token-but-long-enough");
  await page.getByLabel("New password").fill("new-password-1");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expect(page.getByRole("alert")).toContainText("This link is not valid or has expired");
});

test("a C program compiles and runs for everyone", async ({ browser, request }) => {
  test.skip(process.env.E2E_RUNNER !== "1", "needs the runner service and Docker");

  const owner = await register(request, "Anna");
  const project = await createProject(request, owner, "C course");
  const file = await createFile(request, owner, project.id, "main.c");
  const page = await openAs(browser, owner, `/projects/${project.id}/files/${file.id}`);
  await expect(page.getByText("Synced")).toBeVisible();
  // Monaco closes brackets and quotes by itself, so the program is pasted rather than typed.
  await page.locator(".monaco-editor").first().click();
  await page.keyboard.insertText('#include <stdio.h>\nint main(void) { printf("%d\\n", 6 * 7); return 0; }\n');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator("pre")).toContainText("42", { timeout: 60_000 });
});

test("a visitor sees the landing page and can try the app as a guest in one click", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Code together in the browser/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How a class works" })).toBeVisible();
  await page.getByRole("button", { name: "Try it now as a guest" }).click();
  await expect(page.getByRole("heading", { name: /^Hi, Guest \d{4}$/ })).toBeVisible();
});

test("a cancelled GitHub sign-in explains itself and leads back to the sign-in page", async ({ page }) => {
  await page.goto("/auth/github#error=GitHub%20sign-in%20was%20cancelled.");
  await expect(page.getByRole("alert")).toContainText("GitHub sign-in was cancelled.");
  await expect(page).toHaveURL(/\/auth\/github$/);
  await page.getByRole("link", { name: "Back to sign-in" }).click();
  await expect(page).toHaveURL(/\/login/);
});
