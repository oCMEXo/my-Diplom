import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../lib/theme";
import { ErrorBoundary } from "./ErrorBoundary";

const reportError = vi.hoisted(() => vi.fn());
vi.mock("../lib/report-error", () => ({ reportError }));

function Broken(): never {
  throw new Error("render failed");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the page when nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeTruthy();
  });

  it("replaces a crashed page with an explanation and reports the error", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ErrorBoundary>
            <Broken />
          </ErrorBoundary>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText(/Your edits are saved/)).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: "render failed" }));
  });
});
