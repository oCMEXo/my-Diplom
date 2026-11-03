import { describe, expect, it } from "vitest";
import { missingModule, wantsInput } from "./run-hints";

describe("missingModule", () => {
  it("names a missing node package", () => {
    expect(missingModule("Error: Cannot find module 'ethers'\nRequire stack:\n- /tmp/p/main.js")).toBe("ethers");
    expect(missingModule("Error: Cannot find module '@openzeppelin/contracts'")).toBe("@openzeppelin/contracts");
  });

  it("names a missing python module", () => {
    expect(missingModule("ModuleNotFoundError: No module named 'requests'")).toBe("requests");
  });

  it("does not treat the project's own relative imports as packages", () => {
    expect(missingModule("Error: Cannot find module './logger'")).toBeNull();
    expect(missingModule("Error: Cannot find module '../lib/math'")).toBeNull();
  });

  it("is null for ordinary errors", () => {
    expect(missingModule("ZeroDivisionError: division by zero")).toBeNull();
    expect(missingModule("")).toBeNull();
  });
});

describe("wantsInput", () => {
  it("recognises a Python program left without keyboard input", () => {
    expect(wantsInput('  File "/tmp/p/main.py", line 1\nEOFError: EOF when reading a line')).toBe(true);
  });

  it("does not react to other errors or to the word inside a name", () => {
    expect(wantsInput("ZeroDivisionError: division by zero")).toBe(false);
    expect(wantsInput("MyEOFErrorHandler is fine")).toBe(false);
  });
});
