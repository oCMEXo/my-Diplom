import { describe, expect, it } from "vitest";
import { colorForUser, gradientFor, initials } from "./colors";

describe("colors", () => {
  it("gives the same color to the same user every time", () => {
    expect(colorForUser("user-1")).toBe(colorForUser("user-1"));
  });

  it("builds initials from one or two words", () => {
    expect(initials("Anna")).toBe("AN");
    expect(initials("Vlad Ivanov")).toBe("VI");
    expect(initials("Émile Zola")).toBe("ÉZ");
    expect(initials("   ")).toBe("?");
  });

  it("always builds a valid gradient, whatever the id", () => {
    for (let i = 0; i < 300; i += 1) {
      expect(gradientFor(`project-${i}-${i * 7919}`)).not.toContain("undefined");
    }
  });
});
