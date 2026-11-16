import { prisma } from "@collab/db";
import type { ProjectRole } from "@collab/shared";
import { verifyAccessToken } from "./jwt.js";

export interface FileAccess {
  userId: string;
  projectId: string;
  role: ProjectRole;
}

export class AccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function resolveFileAccess(token: string, fileId: string): Promise<FileAccess> {
  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw new AccessError("Invalid or expired token", 401);
  }

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt) {
    throw new AccessError("File not found", 404);
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: file.projectId, userId } },
  });
  if (!membership) {
    throw new AccessError("Not a member of this project", 404);
  }

  return { userId, projectId: file.projectId, role: membership.role };
}
