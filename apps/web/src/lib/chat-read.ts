import type { Message } from "@collab/shared";

const key = (projectId: string) => `collab.chat-read.${projectId}`;

export function markRead(projectId: string, at = new Date().toISOString()): string {
  try {
    localStorage.setItem(key(projectId), at);
  } catch {
  }
  return at;
}

export function readMark(projectId: string): string {
  try {
    const stored = localStorage.getItem(key(projectId));
    if (stored) return stored;
  } catch {
  }
  return markRead(projectId);
}

export function countUnread(messages: Message[], mark: string, userId: string | undefined): number {
  const since = new Date(mark).getTime();
  return messages.filter((m) => m.author.id !== userId && new Date(m.createdAt).getTime() > since).length;
}
