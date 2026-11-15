import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { AppError } from "./errors.js";

const TIMEOUT_MS = 10_000;

/**
 * Asks the sync server to put a version back. Only it holds the live document: writing
 * `files.yjs_state` from here would be overwritten by its next save while people are editing.
 */
export async function restoreThroughCollab(
  userId: string,
  fileId: string,
  versionId: string,
  fetchImpl: typeof fetch = fetch,
) {
  // A one-minute token of the person who asked: the sync server checks their role itself, as for any edit.
  const token = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: 60 });

  let response: Response;
  try {
    response = await fetchImpl(`${env.COLLAB_URL}/files/${fileId}/versions/${versionId}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AppError("The collaboration server is not available. Please try later", 503);
  }

  if (response.ok) return;
  if (response.status === 403) throw new AppError("You do not have the rights for this in the project", 403);
  if (response.status === 404) throw new AppError("Version not found", 404);
  throw new AppError("Could not restore the version: the collaboration server returned an error", 502);
}
