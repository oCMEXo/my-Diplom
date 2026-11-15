import { Database } from "@hocuspocus/extension-database";
import { Prisma, prisma } from "@collab/db";
import { snapshotIfChanged } from "./versions.js";

export const databaseExtension = new Database({
  fetch: async ({ documentName }) => {
    const file = await prisma.file.findUnique({
      where: { id: documentName },
      select: { yjsState: true },
    });
    return file?.yjsState ?? null;
  },
  store: async ({ documentName, state, document, context }) => {
    let file: { type: string };
    try {
      file = await prisma.file.update({
        where: { id: documentName },
        data: { yjsState: state },
        select: { type: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return;
      }
      throw err;
    }

    if (file.type === "board") return;
    const authorId = (context as { userId?: string } | undefined)?.userId ?? null;
    // Versions are optional: a failed snapshot must not fail the save.
    await snapshotIfChanged(documentName, () => document.getText("monaco").toString(), authorId).catch((err) =>
      console.error("[versions] snapshot failed", err),
    );
  },
});
