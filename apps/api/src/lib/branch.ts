import { prisma } from "@collab/db";

/** Active branch of a project. "" means it is not linked to a GitHub branch. */
export async function activeBranch(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { githubBranch: true } });
  return project?.githubBranch ?? "";
}
