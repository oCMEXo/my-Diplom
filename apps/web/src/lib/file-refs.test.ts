import { describe, expect, it } from "vitest";
import { createFileRefParser } from "./file-refs";

const files = [
  { id: "app", path: "src/app.ts" },
  { id: "util", path: "src/util.ts" },
  { id: "util2", path: "lib/util.ts" },
  { id: "readme", path: "README.md" },
  { id: "spaced", path: "docs/my notes.md" },
];
const parse = createFileRefParser(files);

describe("createFileRefParser", () => {
  it("links a full path with a line", () => {
    expect(parse("see src/app.ts:12 here")).toEqual([
      { kind: "text", text: "see " },
      { kind: "file", text: "src/app.ts:12", fileId: "app", line: 12 },
      { kind: "text", text: " here" },
    ]);
  });

  it("keeps the column", () => {
    expect(parse("README.md:3:7")).toEqual([{ kind: "file", text: "README.md:3:7", fileId: "readme", line: 3, column: 7 }]);
  });

  it("links the end of a path when only one file ends like that", () => {
    expect(parse("app.ts:5")).toEqual([{ kind: "file", text: "app.ts:5", fileId: "app", line: 5 }]);
  });

  it("does not guess between two files with the same name", () => {
    expect(parse("util.ts:5")).toEqual([{ kind: "text", text: "util.ts:5" }]);
    expect(parse("lib/util.ts:5")).toEqual([{ kind: "file", text: "lib/util.ts:5", fileId: "util2", line: 5 }]);
  });

  it("links a file whose name has spaces", () => {
    expect(parse("docs/my notes.md:2")).toEqual([{ kind: "file", text: "docs/my notes.md:2", fileId: "spaced", line: 2 }]);
  });

  it("leaves everything that is not a file of the project as text", () => {
    for (const text of ["localhost:8080", "meeting at 12:30", "other.ts:4", "src/app.ts", "src/app.ts:0", "http://x.io/src/app.ts:3"]) {
      expect(parse(text)).toEqual([{ kind: "text", text }]);
    }
  });

  it("finds several links in one message", () => {
    const parts = parse("src/app.ts:1 and README.md:2");
    expect(parts.filter((part) => part.kind === "file").map((part) => part.text)).toEqual(["src/app.ts:1", "README.md:2"]);
  });

  it("works for a project without files", () => {
    expect(createFileRefParser([])("src/app.ts:1")).toEqual([{ kind: "text", text: "src/app.ts:1" }]);
  });
});
