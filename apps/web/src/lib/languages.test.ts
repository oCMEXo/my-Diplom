import { describe, expect, it } from "vitest";
import { describeLanguage, extensionOf, inferLanguage, languageCatalogue } from "@collab/shared";
import { monacoLanguage } from "./monaco-language";

describe("describeLanguage", () => {
  it("says a Python or JavaScript file can be run", () => {
    expect(describeLanguage("src/main.py")).toMatchObject({ name: "Python", support: "run", unknown: false });
    expect(describeLanguage("app.mjs")).toMatchObject({ name: "JavaScript", support: "run" });
  });

  it("says other known languages are only highlighted", () => {
    expect(describeLanguage("main.go")).toMatchObject({ name: "Go", support: "highlight", unknown: false });
    expect(describeLanguage("lib/Token.sol")).toMatchObject({ name: "Solidity", support: "highlight" });
    expect(describeLanguage("Dockerfile")).toMatchObject({ name: "Dockerfile", support: "highlight" });
  });

  it("names an extension it does not know, and does not call a name without one unknown", () => {
    expect(describeLanguage("notes.xyz")).toMatchObject({ name: "Text", support: "text", unknown: true, extension: "xyz" });
    expect(describeLanguage("readme.txt")).toMatchObject({ support: "text", unknown: false });
    expect(describeLanguage(".env")).toMatchObject({ support: "text", unknown: false, extension: null });
    expect(describeLanguage("LICENSE")).toMatchObject({ support: "text", unknown: false });
  });

  it("reads extensions in any case and ignores a trailing dot", () => {
    expect(inferLanguage("MAIN.PY")).toBe("python");
    expect(extensionOf("file.")).toBeNull();
  });
});

describe("languageCatalogue", () => {
  it("lists the languages that run first, each with its extensions", () => {
    const catalogue = languageCatalogue();
    expect(catalogue.slice(0, 2).map((entry) => entry.name)).toEqual(["JavaScript", "Python"]);
    expect(catalogue.find((entry) => entry.language === "javascript")?.extensions).toEqual([".js", ".mjs", ".cjs", ".jsx"]);
    expect(catalogue.every((entry, index) => index < 2 || entry.support === "highlight")).toBe(true);
    expect(catalogue.some((entry) => entry.language === "plaintext")).toBe(false);
  });
});

describe("monacoLanguage", () => {
  it("uses the editor's own name where it differs, and plain text for none", () => {
    expect(monacoLanguage("solidity")).toBe("sol");
    expect(monacoLanguage("python")).toBe("python");
    expect(monacoLanguage(null)).toBe("plaintext");
  });
});
