import { describe, expect, it } from "vitest";
import { withoutToken } from "./log-url.js";

describe("withoutToken", () => {
  it("hides the token wherever it stands in the address", () => {
    expect(withoutToken("/ws?projectId=1&token=abc.def.ghi")).toBe("/ws?projectId=1&token=***");
    expect(withoutToken("/ws?token=abc&projectId=1")).toBe("/ws?token=***&projectId=1");
  });

  it("leaves other addresses alone", () => {
    expect(withoutToken("/projects/1/files?tokenish=1")).toBe("/projects/1/files?tokenish=1");
    expect(withoutToken("/health")).toBe("/health");
  });
});
