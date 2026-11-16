import { prisma } from "@collab/db";

export async function activeBranch(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { githubBranch: true } });
  return project?.githubBranch ?? "";
}
