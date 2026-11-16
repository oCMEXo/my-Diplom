import { Hocuspocus, type Configuration } from "@hocuspocus/server";
import { resolveFileAccess } from "./lib/access.js";
import { databaseExtension } from "./persistence.js";
import { restoreExtension } from "./restore.js";
import { forgetFile } from "./versions.js";

export const WEBSOCKET_OPTIONS = { maxPayload: 4 * 1024 * 1024 };

export function createHocuspocus(configuration: Partial<Configuration> = {}) {
  return new Hocuspocus({
    extensions: [databaseExtension, restoreExtension],
    debounce: 1000,
    maxDebounce: 3000,
    async onAuthenticate(data) {
      const { token, documentName, connection } = data;

      if (!token) {
        throw new Error("Missing token");
      }

      const access = await resolveFileAccess(token, documentName);
      connection.readOnly = access.role === "viewer";

      return {
        userId: access.userId,
        projectId: access.projectId,
        role: access.role,
      };
    },
    async afterUnloadDocument({ documentName }) {
      forgetFile(documentName);
    },
    ...configuration,
  });
}
