import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MESSAGE_PAGE_SIZE, type Message } from "@collab/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { countUnread, markRead, readMark } from "../lib/chat-read";
import { useRealtimeEvents, useRealtimeStatus } from "../lib/RealtimeContext";

export function UnreadWatcher({
  projectId,
  chatShown,
  setUnread,
}: {
  projectId: string;
  chatShown: boolean;
  setUnread: Dispatch<SetStateAction<number>>;
}) {
  const { user } = useAuth();
  const status = useRealtimeStatus();
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");
  const seen = chatShown && pageVisible;
  const seenRef = useRef(seen);
  seenRef.current = seen;
  const userId = user?.id;

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!seen) return;
    markRead(projectId);
    setUnread(0);
  }, [seen, projectId, setUnread]);

  useEffect(() => {
    if (status !== "open" || seenRef.current) return;
    let current = true;
    api
      .get<Message[]>(`/projects/${projectId}/messages?limit=${MESSAGE_PAGE_SIZE}`)
      .then((messages) => {
        if (current && !seenRef.current) setUnread(countUnread(messages, readMark(projectId), userId));
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [status, projectId, userId, setUnread]);

  useRealtimeEvents((event) => {
    if (event.type !== "message.created" || event.message.projectId !== projectId) return;
    if (seenRef.current) markRead(projectId);
    else if (event.message.author.id !== userId) setUnread((count) => count + 1);
  });

  return null;
}
