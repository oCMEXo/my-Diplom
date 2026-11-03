import type { Message } from "@collab/shared";

const key = (projectId: string) => `collab.chat-read.${projectId}`;

export function markRead(projectId: string, at = new Date().toISOString()): string {
  try {
    localStorage.setItem(key(projectId), at);
  } catch {
    // the mark then only lasts until the page is reloaded
  }
  return at;
}

/** When this person last had the project's chat in front of them. */
export function readMark(projectId: string): string {
  try {
    const stored = localStorage.getItem(key(projectId));
    if (stored) return stored;
  } catch {
    // no storage: everything before now counts as read
  }
  // First visit from this browser: the old conversation is not "new" to the person.
  return markRead(projectId);
}

/** Messages from other people written after the mark. */
export function countUnread(messages: Message[], mark: string, userId: string | undefined): number {
  const since = new Date(mark).getTime();
  return messages.filter((m) => m.author.id !== userId && new Date(m.createdAt).getTime() > since).length;
}
