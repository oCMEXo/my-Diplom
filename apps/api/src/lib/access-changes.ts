import { Redis } from "ioredis";
import { ACCESS_CHANGES_CHANNEL, CLOSE_ACCESS_REVOKED, type AccessChange } from "@collab/shared";
import { env } from "../env.js";
import { hub } from "./hub.js";

let publisher: Redis | null = null;

export async function announceAccessChange(change: AccessChange) {
  if (change.reason !== "role") {
    hub.disconnect(change.projectId, change.userId ?? null, CLOSE_ACCESS_REVOKED, change.reason);
  }
  if (change.reason !== "deleted") {
    hub.broadcast(change.projectId, { type: "project.members", projectId: change.projectId });
  }

  publisher ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
  try {
    await publisher.publish(ACCESS_CHANGES_CHANNEL, JSON.stringify(change));
  } catch {
  }
}

export async function closeAccessChanges() {
  publisher?.disconnect();
  publisher = null;
}
