import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@collab/db";
import type { AuthResponse } from "@collab/shared";
import { env } from "../../env.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword } from "../../lib/password.js";
import { issueTokens, toAuthUser } from "./auth.service.js";

const STATE_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;

const states = new Map<string, { redirect: string; expires: number }>();
const exchanges = new Map<string, { auth: AuthResponse; expires: number }>();

function sweep(map: Map<string, { expires: number }>, now = Date.now()) {
  for (const [key, value] of map) if (value.expires < now) map.delete(key);
}

export function githubSignInEnabled() {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

export function safeRedirect(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export function githubAuthorizeUrl(redirect: string | undefined) {
  if (!githubSignInEnabled()) throw new AppError("Sign-in with GitHub is not set up on this server", 404);
  sweep(states);
  const state = randomBytes(24).toString("base64url");
  states.set(state, { redirect: safeRedirect(redirect), expires: Date.now() + STATE_TTL_MS });
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${env.API_PUBLIC_URL}/auth/github/callback`);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

async function githubJson<T>(fetchImpl: typeof fetch, url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new AppError("Could not reach GitHub. Please try again.", 502);
  }
  if (!response.ok) throw new AppError("GitHub did not accept the sign-in. Please try again.", 502);
  return (await response.json()) as T;
}

async function accountFor(github: GithubUser, email: string) {
  const githubId = String(github.id);
  const linked = await prisma.user.findUnique({ where: { githubId } });
  if (linked) return linked;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { githubId, isGuest: false, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
    });
  }
  return prisma.user.create({
    data: {
      email,
      name: (github.name || github.login).slice(0, 100),
      githubId,
      passwordHash: await hashPassword(randomUUID()),
      emailVerifiedAt: new Date(),
    },
  });
}

export async function completeGithubSignIn(code: string, state: string, fetchImpl: typeof fetch = fetch) {
  const pending = states.get(state);
  states.delete(state);
  if (!pending || pending.expires < Date.now()) throw new AppError("The sign-in took too long. Please try again.", 400);

  const token = await githubJson<{ access_token?: string }>(fetchImpl, "https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${env.API_PUBLIC_URL}/auth/github/callback`,
    }),
  });
  if (!token.access_token) throw new AppError("GitHub did not accept the sign-in. Please try again.", 400);

  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token.access_token}`, "User-Agent": "collab" };
  const user = await githubJson<GithubUser>(fetchImpl, "https://api.github.com/user", { headers });
  const emails = await githubJson<GithubEmail[]>(fetchImpl, "https://api.github.com/user/emails", { headers });
  const email = emails.find((item) => item.primary && item.verified)?.email ?? emails.find((item) => item.verified)?.email;
  if (!email) throw new AppError("Your GitHub account has no confirmed email. Confirm one on GitHub and try again.", 400);

  const account = await accountFor(user, email.trim().toLowerCase());
  const tokens = await issueTokens(account);
  sweep(exchanges);
  const exchange = randomBytes(24).toString("base64url");
  exchanges.set(exchange, { auth: { user: toAuthUser(account), tokens }, expires: Date.now() + EXCHANGE_TTL_MS });
  return { exchange, redirect: pending.redirect };
}

export function exchangeGithubCode(code: string) {
  const pending = exchanges.get(code);
  exchanges.delete(code);
  if (!pending || pending.expires < Date.now()) throw new AppError("The sign-in link has expired. Please try again.", 400);
  return pending.auth;
}
