import { describe, expect, it } from "vitest";
import type { Message } from "@collab/shared";
import { countUnread } from "./chat-read";

function message(authorId: string, createdAt: string): Message {
  return {
    id: createdAt,
    projectId: "p",
    body: "текст",
    createdAt,
    author: { id: authorId, name: "Аня", isGuest: false },
  };
}

describe("countUnread", () => {
  const mark = "2026-11-03T10:00:00.000Z";

  it("counts other people's messages written after the mark", () => {
    const messages = [
      message("anya", "2026-11-03T09:59:59.000Z"),
      message("anya", "2026-11-03T10:00:01.000Z"),
      message("vlad", "2026-11-03T10:05:00.000Z"),
    ];
    expect(countUnread(messages, mark, "me")).toBe(2);
  });

  it("does not count my own messages", () => {
    expect(countUnread([message("me", "2026-11-03T10:05:00.000Z")], mark, "me")).toBe(0);
  });

  it("does not count a message written exactly at the mark", () => {
    expect(countUnread([message("anya", mark)], mark, "me")).toBe(0);
  });
});
