import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  AuthResponse,
  AuthUser,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  UpgradeGuestInput,
} from "@collab/shared";
import { api } from "./api";
import { tokenStore, type StoredUser } from "./tokenStore";

interface AuthContextValue {
  user: StoredUser | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  continueAsGuest: (name?: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  upgradeGuest: (input: UpgradeGuestInput) => Promise<void>;
  deleteAccount: (input: DeleteAccountInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const UUID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The offline copies of documents are databases named after the file. */
async function deleteOfflineCopies() {
  const databases = (await indexedDB.databases?.()) ?? [];
  for (const { name } of databases) {
    if (name && UUID_NAME.test(name)) indexedDB.deleteDatabase(name);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const queryClient = useQueryClient();

  // Never leave one user's cached projects behind for the next person on this device,
  // whichever way the session ended: this tab, another tab or an expired token.
  const userId = auth?.user.id;
  const previousUser = useRef(userId);
  useEffect(() => {
    if (previousUser.current && previousUser.current !== userId) {
      queryClient.clear();
      localStorage.removeItem("collab.query-cache");
    }
    previousUser.current = userId;
  }, [userId, queryClient]);

  async function login(input: LoginInput) {
    const result = await api.post<AuthResponse>("/auth/login", input);
    tokenStore.set(result);
  }

  async function register(input: RegisterInput) {
    const result = await api.post<AuthResponse>("/auth/register", input);
    tokenStore.set(result);
  }

  async function continueAsGuest(name?: string) {
    const result = await api.post<AuthResponse>("/auth/guest", { name });
    tokenStore.set(result);
  }

  async function updateName(name: string) {
    const updated = await api.patch<AuthUser>("/auth/me", { name });
    const current = tokenStore.get();
    if (current) tokenStore.set({ ...current, user: updated });
    // Names are shown in lists the server answered earlier; fetch them again.
    queryClient.invalidateQueries();
  }

  async function upgradeGuest(input: UpgradeGuestInput) {
    const updated = await api.post<AuthUser>("/auth/upgrade", input);
    const current = tokenStore.get();
    if (current) tokenStore.set({ ...current, user: updated });
    queryClient.invalidateQueries();
  }

  async function deleteAccount(input: DeleteAccountInput) {
    await api.post("/auth/delete-account", input);
    await deleteOfflineCopies().catch(() => undefined);
    tokenStore.clear();
  }

  function logout() {
    const current = tokenStore.get();
    if (current) {
      api.post("/auth/logout", { refreshToken: current.tokens.refreshToken }).catch(() => {});
    }
    tokenStore.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user ?? null,
        isAuthenticated: !!auth,
        login,
        register,
        continueAsGuest,
        updateName,
        upgradeGuest,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
