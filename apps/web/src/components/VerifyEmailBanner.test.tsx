import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

const state = vi.hoisted(() => ({ user: null as null | { email: string; isGuest: boolean; emailVerified?: boolean } }));
const resendVerification = vi.hoisted(() => vi.fn());
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("../services/auth.service", () => ({ authService: { resendVerification } }));

describe("VerifyEmailBanner", () => {
  beforeEach(() => {
    resendVerification.mockReset();
  });

  it("stays hidden for guests, confirmed addresses and old sessions", () => {
    for (const user of [
      { email: "g@guest.local", isGuest: true, emailVerified: false },
      { email: "a@example.com", isGuest: false, emailVerified: true },
      { email: "a@example.com", isGuest: false },
    ]) {
      state.user = user;
      const { container, unmount } = render(<VerifyEmailBanner />);
      expect(container.textContent).toBe("");
      unmount();
    }
  });

  it("sends the link again and says so", async () => {
    state.user = { email: "anna@example.com", isGuest: false, emailVerified: false };
    let finish!: () => void;
    resendVerification.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<VerifyEmailBanner />);

    expect(screen.getByRole("status").textContent).toContain("open the link we sent to anna@example.com");
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(true);
    finish();
    expect(await screen.findByText("We sent a new link to anna@example.com.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the server's message when sending fails", async () => {
    state.user = { email: "anna@example.com", isGuest: false, emailVerified: false };
    resendVerification.mockRejectedValue(new ApiError("Too many requests. Wait 30 s and try again.", 429));
    const user = userEvent.setup();
    render(<VerifyEmailBanner />);
    await user.click(screen.getByRole("button", { name: "Send again" }));
    expect(await screen.findByText("Too many requests. Wait 30 s and try again.")).toBeTruthy();
  });
});
