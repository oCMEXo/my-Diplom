import { Redis } from "ioredis";
import { ACCESS_CHANGES_CHANNEL, CLOSE_ACCESS_REVOKED, type AccessChange } from "@collab/shared";
import { env } from "../env.js";
import { hub } from "./hub.js";

let publisher: Redis | null = null;

/** Closes sockets that are already open after an access change: our own /ws here, collab via Redis. */
export async function announceAccessChange(change: AccessChange) {
  if (change.reason !== "role") {
    hub.disconnect(change.projectId, change.userId ?? null, CLOSE_ACCESS_REVOKED, change.reason);
  }
  if (change.reason !== "deleted") {
    hub.broadcast(change.projectId, { type: "project.members", projectId: change.projectId });
  }

  // One retry at most, so the request doesn't hang while Redis is down.
  publisher ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
  try {
    await publisher.publish(ACCESS_CHANGES_CHANNEL, JSON.stringify(change));
  } catch {
    // The change is in the DB and every new connection checks it. Without Redis only the
    // documents open right now keep the old role until they reconnect.
  }
}

export async function closeAccessChanges() {
  publisher?.disconnect();
  publisher = null;
}
