import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { env } from "../../env.js";
import { registerUser } from "./auth.service.js";
import {
  completeGithubSignIn,
  exchangeGithubCode,
  githubAuthorizeUrl,
  safeRedirect,
} from "./github-signin.service.js";

const emails: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});

beforeAll(() => {
  Object.assign(env, { GITHUB_CLIENT_ID: "test-client", GITHUB_CLIENT_SECRET: "test-secret" });
});

function fakeGithub(user: { id: number; login: string; name: string | null }, mails: { email: string; primary: boolean; verified: boolean }[]) {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (url === "https://github.com/login/oauth/access_token") {
      const body = JSON.parse(String(init?.body));
      return body.code === "good-code" ? json({ access_token: "gho_test" }) : json({ error: "bad_verification_code" });
    }
    if (url === "https://api.github.com/user") return json(user);
    if (url === "https://api.github.com/user/emails") return json(mails);
    return json({}, 404);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function startState(redirect?: string) {
  return new URL(githubAuthorizeUrl(redirect)).searchParams.get("state")!;
}

describe("sign-in with GitHub", () => {
  it("sends the browser to GitHub with the callback and a state", () => {
    const url = new URL(githubAuthorizeUrl("/classes/1"));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("test-client");
    expect(url.searchParams.get("redirect_uri")).toBe(`${env.API_PUBLIC_URL}/auth/github/callback`);
    expect(url.searchParams.get("state")).toMatch(/^[\w-]{20,}$/);
  });

  it("creates a confirmed account, and the one-time code gives the session once", async () => {
    const email = `${randomUUID()}@example.com`;
    emails.push(email);
    const github = fakeGithub({ id: Date.now(), login: "octo", name: "Octo Cat" }, [
      { email: "old@example.com", primary: false, verified: false },
      { email: email.toUpperCase(), primary: true, verified: true },
    ]);
    const { exchange, redirect } = await completeGithubSignIn("good-code", startState("/class/abc"), github.fetchImpl);
    expect(redirect).toBe("/class/abc");

    const auth = exchangeGithubCode(exchange);
    expect(auth.user).toMatchObject({ email, name: "Octo Cat", isGuest: false, emailVerified: true });
    expect(auth.tokens.accessToken).toBeTruthy();
    expect(() => exchangeGithubCode(exchange)).toThrow(/expired/);
  });

  it("links an existing account by its confirmed email, and finds it next time by the GitHub id", async () => {
    const email = `${randomUUID()}@example.com`;
    emails.push(email);
    const existing = await registerUser({ email, name: "Anna", password: "password123" });
    const githubUser = { id: Date.now() + 1, login: "anna", name: null };
    const github = fakeGithub(githubUser, [{ email, primary: true, verified: true }]);

    const first = exchangeGithubCode((await completeGithubSignIn("good-code", startState(), github.fetchImpl)).exchange);
    expect(first.user.id).toBe(existing.user.id);

    const renamed = fakeGithub(githubUser, [{ email: `${randomUUID()}@example.com`, primary: true, verified: true }]);
    const second = exchangeGithubCode((await completeGithubSignIn("good-code", startState(), renamed.fetchImpl)).exchange);
    expect(second.user.id).toBe(existing.user.id);
  });

  it("refuses an unknown state, a bad code and an account without a confirmed email", async () => {
    const github = fakeGithub({ id: 1, login: "x", name: null }, [{ email: "x@example.com", primary: true, verified: false }]);
    await expect(completeGithubSignIn("good-code", "made-up-state", github.fetchImpl)).rejects.toMatchObject({ statusCode: 400 });
    await expect(completeGithubSignIn("bad-code", startState(), github.fetchImpl)).rejects.toMatchObject({ statusCode: 400 });
    await expect(completeGithubSignIn("good-code", startState(), github.fetchImpl)).rejects.toThrow(/no confirmed email/);
  });

  it("only goes back to paths on this site", () => {
    expect(safeRedirect("/projects/1")).toBe("/projects/1");
    expect(safeRedirect("https://evil.example")).toBe("/");
    expect(safeRedirect("//evil.example")).toBe("/");
    expect(safeRedirect(undefined)).toBe("/");
  });
});
