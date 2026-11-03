import { createHmac } from "node:crypto";
import type { APIRequestContext, Browser, Page } from "@playwright/test";

export const API = "http://localhost:3101";

export interface Auth {
  user: { id: string; email: string; name: string; isGuest: boolean };
  tokens: { accessToken: string; refreshToken: string };
}

export interface ProjectInfo {
  id: string;
  inviteCode: string;
}

const bearer = (auth: Auth) => ({ Authorization: `Bearer ${auth.tokens.accessToken}` });

export async function register(request: APIRequestContext, name: string): Promise<Auth> {
  const response = await request.post(`${API}/auth/register`, {
    data: { name, email: `${crypto.randomUUID()}@e2e.local`, password: "password123" },
  });
  return response.json();
}

export async function guest(request: APIRequestContext, name: string): Promise<Auth> {
  const response = await request.post(`${API}/auth/guest`, { data: { name } });
  return response.json();
}

export async function createProject(
  request: APIRequestContext,
  auth: Auth,
  name: string,
): Promise<ProjectInfo> {
  const response = await request.post(`${API}/projects`, { headers: bearer(auth), data: { name } });
  return response.json();
}

export async function createFile(
  request: APIRequestContext,
  auth: Auth,
  projectId: string,
  path: string,
  type: "code" | "doc" | "board" = "code",
): Promise<{ id: string }> {
  const response = await request.post(`${API}/projects/${projectId}/files`, {
    headers: bearer(auth),
    data: { path, type },
  });
  return response.json();
}

export async function join(request: APIRequestContext, auth: Auth, inviteCode: string) {
  await request.post(`${API}/join/${inviteCode}`, { headers: bearer(auth) });
}

export async function setInviteRole(
  request: APIRequestContext,
  auth: Auth,
  projectId: string,
  role: "editor" | "viewer",
) {
  await request.patch(`${API}/projects/${projectId}/invite`, {
    headers: bearer(auth),
    data: { role },
  });
}

/** The same session, but its access token runs out in the given number of seconds (negative: already has). */
export function withExpiringToken(auth: Auth, seconds: number): Auth {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: auth.user.id,
    email: auth.user.email,
    exp: Math.floor(Date.now() / 1000) + seconds,
  })}`;
  const signature = createHmac("sha256", "e2e-access-secret-0123456789").update(body).digest("base64url");
  return { ...auth, tokens: { ...auth.tokens, accessToken: `${body}.${signature}` } };
}

/** Opens a page that is already signed in as `auth`, using the same storage the app reads. */
export async function openAs(browser: Browser, auth: Auth, path: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript((stored) => {
    window.localStorage.setItem("collab.auth", stored);
  }, JSON.stringify({ user: auth.user, tokens: auth.tokens }));
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

export async function editorText(page: Page): Promise<string> {
  const text = await page.locator(".monaco-editor .view-lines").first().innerText();
  return text.replaceAll(" ", " ");
}

export async function typeInEditor(page: Page, text: string) {
  await page.locator(".monaco-editor").first().click();
  await page.keyboard.type(text);
}

export async function importRepo(request: APIRequestContext, auth: Auth, projectId: string, url: string) {
  const response = await request.post(`${API}/projects/${projectId}/import/github`, {
    headers: bearer(auth),
    data: { url },
    timeout: 60_000,
  });
  if (!response.ok()) throw new Error(`import failed: ${response.status()} ${await response.text()}`);
}
