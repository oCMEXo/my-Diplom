import type { AuthResponse, AuthUser, DeleteAccountInput, LoginInput, RegisterInput, UpgradeGuestInput } from "@collab/shared";
import { api } from "../lib/api";

export const authService = {
  login: (input: LoginInput) => api.post<AuthResponse>("/auth/login", input),
  register: (input: RegisterInput) => api.post<AuthResponse>("/auth/register", input),
  guest: (name?: string) => api.post<AuthResponse>("/auth/guest", { name }),
  logout: (refreshToken: string) => api.post<void>("/auth/logout", { refreshToken }),
  me: () => api.get<{ userId: string }>("/auth/me"),
  updateName: (name: string) => api.patch<AuthUser>("/auth/me", { name }),
  upgradeGuest: (input: UpgradeGuestInput) => api.post<AuthUser>("/auth/upgrade", input),
  deleteAccount: (input: DeleteAccountInput) => api.post<void>("/auth/delete-account", input),
  forgotPassword: (email: string) => api.post<void>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => api.post<void>("/auth/reset-password", { token, password }),
  verifyEmail: (token: string) => api.post<AuthUser>("/auth/verify-email", { token }),
  resendVerification: () => api.post<void>("/auth/resend-verification"),
  githubExchange: (code: string) => api.post<AuthResponse>("/auth/github/exchange", { code }),
};
