import { useCallback, useEffect, useRef, useState } from "react";
import {
  accessChangeReasonSchema,
  CLOSE_ACCESS_REVOKED,
  realtimeEventSchema,
  type AccessChangeReason,
  type PresenceFileMessage,
  type RealtimeEvent,
} from "@collab/shared";
import { api, API_URL, freshAccessToken } from "./api";
import { wsUrl } from "./endpoints";
import { tokenStore } from "./tokenStore";

const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_FORBIDDEN = 4403;
const MAX_BACKOFF_MS = 5000;

export type RealtimeStatus = "connecting" | "open" | "closed";

export function useProjectEvents(
  projectId: string,
  onEvent: (event: RealtimeEvent) => void,
  onRevoked?: (reason: AccessChangeReason) => void,
) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const revokedRef = useRef(onRevoked);
  revokedRef.current = onRevoked;
  const socketRef = useRef<WebSocket | null>(null);
  const fileRef = useRef<string | null>(null);

  const sendFile = useCallback((socket: WebSocket | null) => {
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "presence.file", fileId: fileRef.current } satisfies PresenceFileMessage));
  }, []);

  const announceFile = useCallback(
    (fileId: string | null) => {
      fileRef.current = fileId;
      sendFile(socketRef.current);
    },
    [sendFile],
  );

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    async function connect() {
      if (disposed || !tokenStore.get()) return;
      setStatus("connecting");

      const token = await freshAccessToken();
      if (disposed || !token) return;

      const url = new URL(wsUrl(API_URL, window.location.origin, "/ws"));
      url.searchParams.set("projectId", projectId);
      url.searchParams.set("token", token);

      const socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
        if (fileRef.current) sendFile(socket);
      };
      socket.onmessage = (message) => {
        try {
          const parsed = realtimeEventSchema.safeParse(JSON.parse(message.data));
          if (parsed.success) handlerRef.current(parsed.data);
        } catch {
        }
      };
      socket.onclose = async (event) => {
        if (disposed) return;
        setStatus("closed");
        if (event.code === CLOSE_FORBIDDEN) return;
        if (event.code === CLOSE_ACCESS_REVOKED) {
          const reason = accessChangeReasonSchema.safeParse(event.reason);
          revokedRef.current?.(reason.success ? reason.data : "removed");
          return;
        }
        if (event.code === CLOSE_UNAUTHORIZED) {
          await api.get("/auth/me").catch(() => undefined);
        }
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    }

    void connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [projectId, sendFile]);

  return { status, announceFile };
}
