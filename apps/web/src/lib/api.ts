import { RUN_CODE_HEADER } from "@collab/shared";
import { currentRunCode } from "./run-code";
import { expiresWithin } from "./token-expiry";
import { tokenStore } from "./tokenStore";

const API_URL = import.meta.env.VITE_API_URL;

const EXPIRY_MARGIN_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<void> | null = null;

async function renewTokens(seenAccessToken: string): Promise<void> {
  const auth = tokenStore.reload();
  if (!auth) throw new ApiError("Please sign in again", 401);
  if (auth.tokens.accessToken !== seenAccessToken) return;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: auth.tokens.refreshToken }),
  });

  if (response.status === 401) {
    if (!navigator.locks) await new Promise((resolve) => setTimeout(resolve, 500));
    const latest = tokenStore.reload();
    if (latest && latest.tokens.refreshToken !== auth.tokens.refreshToken) return;
    tokenStore.clear();
    throw new ApiError("Your session has expired. Please sign in again", 401);
  }

  if (!response.ok) throw new ApiError("The server is not answering. Please try again a bit later", response.status);

  const data = await response.json();
  tokenStore.setTokens(data.tokens);
}

async function renewOneTabAtATime(seenAccessToken: string): Promise<void> {
  if (!navigator.locks) return renewTokens(seenAccessToken);
  await navigator.locks.request("collab.auth-refresh", () => renewTokens(seenAccessToken));
}

function refreshTokens(): Promise<void> {
  refreshPromise ??= renewOneTabAtATime(tokenStore.get()?.tokens.accessToken ?? "").finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function freshAccessToken(): Promise<string> {
  const token = tokenStore.get()?.tokens.accessToken;
  if (token && expiresWithin(token, EXPIRY_MARGIN_MS)) {
    await refreshTokens().catch(() => undefined);
  }
  return tokenStore.get()?.tokens.accessToken ?? "";
}

async function send(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const auth = tokenStore.get();
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    headers.set("Authorization", `Bearer ${auth.tokens.accessToken}`);
  }
  const code = currentRunCode();
  if (code) headers.set(RUN_CODE_HEADER, code);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && auth && retry) {
    await refreshTokens();
    return send(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? "The request failed", response.status);
  }

  return response;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  download: async (path: string) => (await send(path)).blob(),
};

export { API_URL };
