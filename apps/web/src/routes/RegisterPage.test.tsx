import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { renderPage } from "../test/render";
import { RegisterPage } from "./RegisterPage";

const auth = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock("../lib/auth", () => ({ useAuth: () => auth }));
vi.mock("../lib/features", () => ({ useFeatures: () => ({ run: "open", passwordReset: true, githubSignIn: false }) }));

describe("RegisterPage", () => {
  beforeEach(() => {
    auth.register.mockReset();
  });

  it("checks every field with the same rules as the server", async () => {
    const { user } = renderPage(<RegisterPage />, { path: "/register", route: "/register" });
    await user.type(screen.getByLabelText("Name"), "   ");
    await user.type(screen.getByLabelText("Email"), "anna@");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter your name")).toBeTruthy();
    expect(screen.getByText(/Enter a valid email address/)).toBeTruthy();
    expect(screen.getByText("Use 8 to 72 characters")).toBeTruthy();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it("creates the account with a trimmed name", async () => {
    auth.register.mockResolvedValue(undefined);
    const { user } = renderPage(<RegisterPage />, { path: "/register", route: "/register" });
    await user.type(screen.getByLabelText("Name"), "  Anna ");
    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(auth.register).toHaveBeenCalledWith({ name: "  Anna ", email: "anna@example.com", password: "password123" });
    expect(await screen.findByText("Navigated away")).toBeTruthy();
  });

  it("keeps what was typed and explains a taken address", async () => {
    auth.register.mockRejectedValue(new ApiError("This email is already registered", 409));
    const { user } = renderPage(<RegisterPage />, { path: "/register", route: "/register" });
    await user.type(screen.getByLabelText("Name"), "Anna");
    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect((await screen.findByRole("alert")).textContent).toBe("This email is already registered");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("anna@example.com");
  });
});
