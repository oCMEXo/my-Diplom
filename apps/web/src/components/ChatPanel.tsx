import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { SendHorizontal } from "lucide-react";
import { MESSAGE_PAGE_SIZE, type FileRecord, type Message } from "@collab/shared";
import { useAuth } from "../lib/auth";
import { createFileRefParser } from "../lib/file-refs";
import { useRealtimeEvents, useRealtimeStatus } from "../lib/RealtimeContext";
import { Spinner } from "./ui/Spinner";
import { Avatar } from "./ui/Avatar";
import { IconButton } from "./ui/Button";
import { messagesService } from "../services/collaboration.service";

export interface ChatInsert {
  text: string;
  key: number;
}

function mergeById(existing: Message[], incoming: Message[]) {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

const GROUP_GAP_MS = 5 * 60 * 1000;

export function ChatPanel({
  projectId,
  files,
  insert,
  onInsertDone,
  onFileLink,
}: {
  projectId: string;
  files: FileRecord[];
  insert: ChatInsert | null;
  onInsertDone: () => void;
  onFileLink: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const loadedOnce = useRef(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const insertedKey = useRef<number | null>(null);
  const parseRefs = useMemo(() => createFileRefParser(files.filter((file) => file.type !== "board")), [files]);

  const loadLatest = useCallback(async () => {
    const latest = await messagesService.latest(projectId);
    setMessages((prev) => mergeById(prev, latest));
    setLoadState("ready");
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      setHasMore(latest.length === MESSAGE_PAGE_SIZE);
    }
  }, [projectId]);

  const status = useRealtimeStatus();
  useRealtimeEvents((event) => {
    if (event.type === "message.created" && event.message.projectId === projectId) {
      setMessages((prev) => mergeById(prev, [event.message]));
    }
  });

  useEffect(() => {
    setMessages([]);
    setLoadState("loading");
    loadedOnce.current = false;
    loadLatest().catch(() => setLoadState("failed"));
  }, [loadLatest]);

  useEffect(() => {
    if (status === "open" && loadedOnce.current) loadLatest().catch(() => undefined);
  }, [status, loadLatest]);

  useEffect(() => {
    if (!insert || insertedKey.current === insert.key) return;
    insertedKey.current = insert.key;
    setDraft((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}${insert.text} `);
    onInsertDone();
    requestAnimationFrame(() => {
      const el = composer.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [insert, onInsertDone]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useLayoutEffect(() => {
    const el = composer.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function loadOlder() {
    const first = messages[0];
    if (!first) return;
    const el = listRef.current;
    const previousHeight = el?.scrollHeight ?? 0;
    const older = await messagesService.before(projectId, first.id);
    stickToBottom.current = false;
    setMessages((prev) => mergeById(prev, older));
    setHasMore(older.length === MESSAGE_PAGE_SIZE);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - previousHeight;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSendError(null);
    setDraft("");
    stickToBottom.current = true;
    try {
      const message = await messagesService.send(projectId, body);
      setMessages((prev) => mergeById(prev, [message]));
    } catch {
      setDraft(body);
      setSendError("Could not send");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {hasMore && (
          <button
            onClick={() => loadOlder().catch(() => undefined)}
            className="mb-3 w-full rounded-lg border border-line py-1.5 text-sm text-muted transition hover:bg-raised hover:text-fg"
          >
            Show earlier
          </button>
        )}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            {loadState === "loading" && <Spinner />}
            {loadState === "failed" && (
              <>
                <p className="text-base font-medium">Could not load the chat</p>
                <button
                  onClick={() => {
                    setLoadState("loading");
                    loadLatest().catch(() => setLoadState("failed"));
                  }}
                  className="text-sm font-medium text-accent-ink hover:underline"
                >
                  Try again
                </button>
              </>
            )}
            {loadState === "ready" && (
              <>
                <p className="text-base font-medium">No messages yet</p>
                <p className="text-sm text-muted">Write the first message. Everyone in the project will see it.</p>
              </>
            )}
          </div>
        )}
        {messages.map((m, index) => {
          const previous = messages[index - 1];
          const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const grouped =
            !newDay &&
            previous.author.id === m.author.id &&
            new Date(m.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_GAP_MS;
          const mine = m.author.id === user?.id;
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex items-center gap-3 text-xs font-medium text-faint">
                  <span className="h-px flex-1 bg-line" />
                  {formatDay(m.createdAt)}
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <div className={`group flex gap-3 ${grouped ? "mt-0.5" : "mt-4"}`}>
                <div className="w-8 shrink-0 pt-0.5">
                  {!grouped && <Avatar id={m.author.id} name={m.author.name} size="sm" />}
                </div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-fg">{mine ? "You" : m.author.name}</span>
                      {m.author.isGuest && !mine && <span className="text-xs text-faint">guest</span>}
                      <span className="text-xs text-faint">{formatTime(m.createdAt)}</span>
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">
                    {parseRefs(m.body).map((part, partIndex) =>
                      part.kind === "text" ? (
                        part.text
                      ) : (
                        <Link
                          key={partIndex}
                          to={`/projects/${projectId}/files/${part.fileId}?line=${part.line}${part.column ? `&col=${part.column}` : ""}`}
                          onClick={onFileLink}
                          title="Open the file at this line"
                          className="rounded bg-accent/10 px-1 font-mono text-[0.875em] text-accent-ink hover:underline"
                        >
                          {part.text}
                        </Link>
                      ),
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-3">
        {sendError && <p className="mb-2 text-sm text-bad">{sendError}</p>}
        {status !== "open" && (
          <p role="status" className="mb-2 text-sm text-warn">
            {status === "connecting" ? "Connecting to the chat…" : "No connection. Messages may arrive late"}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-faint/80 bg-canvas px-3 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <textarea
            ref={composer}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={2000}
            rows={1}
            placeholder="Message..."
            aria-label="Message"
            className="mb-1 max-h-32 min-h-[1.5rem] min-w-0 flex-1 resize-none bg-transparent text-base leading-6 placeholder:text-faint focus:outline-none"
          />
          <IconButton label="Send" type="submit" disabled={!draft.trim()} className="-mr-1 h-8 w-8 text-accent-ink">
            <SendHorizontal size={20} />
          </IconButton>
        </div>
      </form>
    </div>
  );
}
