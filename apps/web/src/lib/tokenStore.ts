export interface StoredUser {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = "collab.auth";

interface StoredAuth {
  tokens: AuthTokens;
  user: StoredUser;
}

let current: StoredAuth | null = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (current) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  notify();
}

// Signing in or out in one tab, or renewing the tokens there, applies to the other tabs too.
globalThis.addEventListener?.("storage", (event) => {
  const { key } = event as StorageEvent;
  if (key !== null && key !== STORAGE_KEY) return;
  current = loadFromStorage();
  notify();
});

export const tokenStore = {
  get(): StoredAuth | null {
    return current;
  },
  /** Reads the saved copy, which another tab may have renewed a moment ago. */
  reload(): StoredAuth | null {
    const stored = loadFromStorage();
    if (stored?.tokens.refreshToken !== current?.tokens.refreshToken) {
      current = stored;
      notify();
    }
    return current;
  },
  set(auth: StoredAuth) {
    current = auth;
    persist();
  },
  setTokens(tokens: AuthTokens) {
    if (!current) return;
    current = { ...current, tokens };
    persist();
  },
  clear() {
    current = null;
    persist();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
