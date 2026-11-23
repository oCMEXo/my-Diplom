import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FileRecord } from "@collab/shared";
import { ApiError } from "../lib/api";
import { CreateFileDialog } from "./CreateFileDialog";

const existing = [{ id: "1", path: "main.py" }] as FileRecord[];

function setup(onCreate = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<CreateFileDialog initialType="code" files={existing} onClose={onClose} onCreate={onCreate} />);
  return { user, onCreate, onClose, create: () => screen.getByRole("button", { name: "Create" }) as HTMLButtonElement };
}

describe("CreateFileDialog", () => {
  it("keeps the button off until a name is typed", () => {
    const { create } = setup();
    expect(create().disabled).toBe(true);
  });

  it("says at once that a name is taken, without asking the server", async () => {
    const { user, create, onCreate } = setup();
    await user.type(screen.getByLabelText("File name"), "main.py");

    expect(screen.getByText("A file with this name already exists")).toBeTruthy();
    expect(screen.getByLabelText("File name").getAttribute("aria-invalid")).toBe("true");
    expect(create().disabled).toBe(true);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("refuses a path that leaves the project", async () => {
    const { user, create } = setup();
    await user.type(screen.getByLabelText("File name"), "../secret.py");
    expect(screen.getByText(/must not start or end with/)).toBeTruthy();
    expect(create().disabled).toBe(true);
  });

  it("creates a document of the chosen type and closes", async () => {
    const { user, onCreate, onClose } = setup();
    await user.click(screen.getByRole("radio", { name: "Document" }));
    await user.type(screen.getByLabelText("File name"), "  notes.md ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onCreate).toHaveBeenCalledWith("notes.md", "doc");
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open and shows the server's message when creating fails", async () => {
    const { user, onClose } = setup(vi.fn().mockRejectedValue(new ApiError("This project has reached the limit of 2000 files.", 403)));
    await user.type(screen.getByLabelText("File name"), "extra.py");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect((await screen.findByRole("alert")).textContent).toContain("limit of 2000 files");
    expect(onClose).not.toHaveBeenCalled();
  });
});
