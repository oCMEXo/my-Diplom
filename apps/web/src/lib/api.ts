import { RUN_CODE_HEADER } from "@collab/shared";
import { currentRunCode } from "./run-code";
import { expiresWithin } from "./token-expiry";
import { tokenStore } from "./tokenStore";

const API_URL = import.meta.env.VITE_API_URL;

/** A WebSocket connecting with a token this close to expiry may be refused, so it gets a new one first. */
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
  // While this tab was waiting for its turn, another one may have renewed the pair already.
  const auth = tokenStore.reload();
  if (!auth) throw new ApiError("Нужно войти снова", 401);
  if (auth.tokens.accessToken !== seenAccessToken) return;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: auth.tokens.refreshToken }),
  });

  if (response.status === 401) {
    // Without Web Locks another tab can win the race, and its answer may still be on the way to storage.
    if (!navigator.locks) await new Promise((resolve) => setTimeout(resolve, 500));
    const latest = tokenStore.reload();
    if (latest && latest.tokens.refreshToken !== auth.tokens.refreshToken) return;
    tokenStore.clear();
    throw new ApiError("Сессия истекла: войдите снова", 401);
  }

  // A 429 or a 502 says nothing about the session, so it must not sign the person out.
  if (!response.ok) throw new ApiError("Сервер сейчас не отвечает, попробуйте чуть позже", response.status);

  const data = await response.json();
  tokenStore.setTokens(data.tokens);
}

async function renewOneTabAtATime(seenAccessToken: string): Promise<void> {
  if (!navigator.locks) return renewTokens(seenAccessToken);
  await navigator.locks.request("collab.auth-refresh", () => renewTokens(seenAccessToken));
}

/** Renews the tokens once, however many requests and tabs need that at the same moment. */
function refreshTokens(): Promise<void> {
  refreshPromise ??= renewOneTabAtATime(tokenStore.get()?.tokens.accessToken ?? "").finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/** The access token for a new WebSocket connection, which, unlike a request, has no 401 to retry after. */
export async function freshAccessToken(): Promise<string> {
  const token = tokenStore.get()?.tokens.accessToken;
  if (token && expiresWithin(token, EXPIRY_MARGIN_MS)) {
    // No network: connecting fails anyway, and the next attempt comes back here.
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
  // Only the site owner's access code lets code run on a public host; the server ignores it elsewhere.
  const code = currentRunCode();
  if (code) headers.set(RUN_CODE_HEADER, code);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && auth && retry) {
    await refreshTokens();
    return send(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? "Не удалось выполнить запрос", response.status);
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
