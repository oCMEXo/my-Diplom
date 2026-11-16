import { strToU8, zipSync } from "fflate";
import { prisma } from "@collab/db";
import { requireProjectRole } from "../../lib/authorization.js";
import { activeBranch } from "../../lib/branch.js";
import { yjsStateToText } from "../../lib/yjs-text.js";

export async function exportProject(userId: string, projectId: string) {
  await requireProjectRole(projectId, userId, "viewer");

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } });
  const files = await prisma.file.findMany({
    where: { projectId, branch: await activeBranch(projectId), deletedAt: null, type: { not: "board" } },
    select: { path: true, yjsState: true },
  });

  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    if (file.path.startsWith("/") || file.path.split("/").includes("..")) continue;
    entries[file.path] = strToU8(yjsStateToText(file.yjsState));
  }

  return { name: project.name, zip: Buffer.from(zipSync(entries)) };
}
