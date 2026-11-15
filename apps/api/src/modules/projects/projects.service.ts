import { prisma } from "@collab/db";
import type { CreateProjectInput, InviteMemberInput, InviteRole, ProjectRole } from "@collab/shared";
import { AppError } from "../../lib/errors.js";
import { requireProjectRole } from "../../lib/authorization.js";
import { generateInviteCode } from "../../lib/invite-code.js";
import { announceAccessChange } from "../../lib/access-changes.js";
import { hub } from "../../lib/hub.js";
import { templateFiles } from "./templates.js";

interface ProjectLike {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  inviteCode: string;
  inviteRole: ProjectRole;
  githubOwner: string | null;
  githubRepo: string | null;
  githubBranch: string | null;
}

function toProjectDto(project: ProjectLike, myRole: ProjectRole) {
  return {
    id: project.id,
    name: project.name,
    ownerId: project.ownerId,
    createdAt: project.createdAt.toISOString(),
    myRole,
    // With the code a viewer could join again under another account and get the link's role.
    inviteCode: myRole === "viewer" ? null : project.inviteCode,
    inviteRole: project.inviteRole as InviteRole,
    github:
      project.githubOwner && project.githubRepo
        ? { owner: project.githubOwner, repo: project.githubRepo, branch: project.githubBranch }
        : null,
  };
}

export async function createProject(userId: string, input: CreateProjectInput) {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      ownerId: userId,
      inviteCode: generateInviteCode(),
      members: { create: { userId, role: "owner" } },
      files: input.template ? { create: templateFiles(input.template) } : undefined,
    },
  });

  return toProjectDto(project, "owner");
}

export async function listProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { project: { createdAt: "desc" } },
  });

  return memberships.map((m) => toProjectDto(m.project, m.role));
}

export async function getProject(userId: string, projectId: string) {
  const myRole = await requireProjectRole(projectId, userId, "viewer");

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { include: { user: true } } },
  });

  return {
    ...toProjectDto(project, myRole),
    members: project.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      role: m.role,
    })),
  };
}

export async function deleteProject(userId: string, projectId: string) {
  await requireProjectRole(projectId, userId, "owner");
  await prisma.project.delete({ where: { id: projectId } });
  await announceAccessChange({ projectId, reason: "deleted" });
}

export async function inviteMember(
  requesterId: string,
  projectId: string,
  input: InviteMemberInput,
) {
  await requireProjectRole(projectId, requesterId, "owner");

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError("No user with this email. They need to sign up first", 404);
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) {
    throw new AppError("This person is already in the project", 409);
  }

  await prisma.projectMember.create({
    data: { projectId, userId: user.id, role: input.role },
  });

  return { userId: user.id, name: user.name, role: input.role };
}

export async function updateMemberRole(
  requesterId: string,
  projectId: string,
  targetUserId: string,
  role: "editor" | "viewer",
) {
  await requireProjectRole(projectId, requesterId, "owner");

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) {
    throw new AppError("Member not found", 404);
  }
  if (target.role === "owner") {
    throw new AppError("The owner's role cannot be changed", 400);
  }

  if (target.role === role) return;

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
  });
  // Someone just demoted has seen the invitation link and could use it to come back as an editor.
  if (role === "viewer") await rotateInviteCode(projectId);
  // Open documents keep the role they connected with; reconnecting gives them the new one.
  await announceAccessChange({ projectId, userId: targetUserId, reason: "role" });
}

export async function removeMember(
  requesterId: string,
  projectId: string,
  targetUserId: string,
) {
  const requesterRole = await requireProjectRole(projectId, requesterId, "viewer");

  if (requesterId !== targetUserId) {
    if (requesterRole !== "owner") {
      throw new AppError("Only the owner can remove other members", 403);
    }
  }

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) {
    throw new AppError("Member not found", 404);
  }
  if (target.role === "owner") {
    throw new AppError("The owner cannot be removed from the project. The project can only be deleted", 400);
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  // Otherwise whoever was removed could walk straight back in with the link they already have.
  if (requesterId !== targetUserId) await rotateInviteCode(projectId);
  await announceAccessChange({
    projectId,
    userId: targetUserId,
    reason: requesterId === targetUserId ? "left" : "removed",
  });
}

async function rotateInviteCode(projectId: string) {
  await prisma.project.update({ where: { id: projectId }, data: { inviteCode: generateInviteCode() } });
}

export async function regenerateInviteLink(requesterId: string, projectId: string) {
  await requireProjectRole(projectId, requesterId, "owner");

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { inviteCode: generateInviteCode() },
  });

  return { inviteCode: project.inviteCode, inviteRole: project.inviteRole as InviteRole };
}

export async function updateInviteRole(requesterId: string, projectId: string, role: InviteRole) {
  await requireProjectRole(projectId, requesterId, "owner");

  const current = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { inviteRole: true } });
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      inviteRole: role,
      // A link handed out as read-only must not start giving write access by itself.
      ...(current.inviteRole === "viewer" && role === "editor" ? { inviteCode: generateInviteCode() } : {}),
    },
  });

  return { inviteCode: project.inviteCode, inviteRole: project.inviteRole as InviteRole };
}

export async function previewInvite(inviteCode: string) {
  const project = await prisma.project.findUnique({
    where: { inviteCode },
    include: { owner: { select: { name: true } } },
  });
  if (!project) {
    throw new AppError("The invite link is not valid or has expired", 404);
  }
  return {
    projectName: project.name,
    ownerName: project.owner.name,
    role: project.inviteRole as InviteRole,
  };
}

export async function joinViaInvite(userId: string, inviteCode: string) {
  const project = await prisma.project.findUnique({ where: { inviteCode } });
  if (!project) {
    throw new AppError("The invite link is not valid or has expired", 404);
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId } },
  });

  const role = existing?.role ?? (project.inviteRole as ProjectRole);
  if (!existing) {
    await prisma.projectMember.create({
      data: { projectId: project.id, userId, role },
    });
    hub.broadcast(project.id, { type: "project.members", projectId: project.id });
  }

  return toProjectDto(project, role);
}
