import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { renderPage } from "../test/render";
import { LoginPage } from "./LoginPage";

const auth = vi.hoisted(() => ({ login: vi.fn(), continueAsGuest: vi.fn() }));
vi.mock("../lib/auth", () => ({ useAuth: () => auth }));
vi.mock("../lib/features", () => ({ useFeatures: () => ({ run: "open", passwordReset: true, githubSignIn: false }) }));

describe("LoginPage", () => {
  beforeEach(() => {
    auth.login.mockReset();
    auth.continueAsGuest.mockReset();
  });

  it("shows field errors and does not call the server when the form is empty", async () => {
    const { user } = renderPage(<LoginPage />, { path: "/login", route: "/login" });
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText(/Enter a valid email address/)).toBeTruthy();
    expect(screen.getByText("Enter your password")).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("clears an error as soon as the field is fixed", async () => {
    const { user } = renderPage(<LoginPage />, { path: "/login", route: "/login" });
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.type(screen.getByLabelText("Email"), "anna@example.com");

    expect(screen.queryByText(/Enter a valid email address/)).toBeNull();
    expect(screen.getByText("Enter your password")).toBeTruthy();
  });

  it("signs in with valid data, shows the loading state and goes on", async () => {
    let finish!: () => void;
    auth.login.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { user } = renderPage(<LoginPage />, { path: "/login", route: "/login" });

    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.login).toHaveBeenCalledWith({ email: "anna@example.com", password: "password123" });
    expect((screen.getByRole("button", { name: "Signing in…" }) as HTMLButtonElement).disabled).toBe(true);
    finish();
    expect(await screen.findByText("Navigated away")).toBeTruthy();
  });

  it("shows the server's message when the sign-in is refused", async () => {
    auth.login.mockRejectedValue(new ApiError("Wrong email or password", 401));
    const { user } = renderPage(<LoginPage />, { path: "/login", route: "/login" });

    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Wrong email or password");
  });

  it("offers a password reset when the server supports it", () => {
    renderPage(<LoginPage />, { path: "/login", route: "/login" });
    expect(screen.getByRole("link", { name: "Forgot password?" }).getAttribute("href")).toBe("/forgot-password");
  });
});
