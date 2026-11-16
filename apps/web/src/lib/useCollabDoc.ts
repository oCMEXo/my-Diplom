import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { freshAccessToken } from "./api";
import { colorForUser } from "./colors";
import { wsUrl } from "./endpoints";
import { tokenStore } from "./tokenStore";

const COLLAB_URL = import.meta.env.VITE_COLLAB_URL;

export type CollabStatus = "connecting" | "connected" | "offline";

export function useCollabDoc(fileId: string) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<CollabStatus>("connecting");

  useEffect(() => {
    const auth = tokenStore.get();
    if (!auth) return;

    const next = new HocuspocusProvider({
      url: wsUrl(COLLAB_URL, window.location.origin),
      name: fileId,
      token: freshAccessToken,
      onStatus: ({ status: value }) =>
        setStatus(value === "connected" ? "connected" : value === "connecting" ? "connecting" : "offline"),
    });
    const persistence = new IndexeddbPersistence(fileId, next.document);
    next.setAwarenessField("user", { id: auth.user.id, name: auth.user.name, color: colorForUser(auth.user.id) });
    setProvider(next);

    return () => {
      setProvider(null);
      next.destroy();
      void persistence.destroy();
    };
  }, [fileId]);

  return { provider, status };
}
