import { z } from "zod";
import { PROJECT_ROLES, PROJECT_TEMPLATES } from "../constants.js";
import { emailSchema } from "./auth.js";

export const projectRoleSchema = z.enum(PROJECT_ROLES);

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  template: z.enum(PROJECT_TEMPLATES).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const projectMemberSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  role: projectRoleSchema,
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;

export const inviteRoleSchema = z.enum(["editor", "viewer"]);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

export const githubLinkSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  branch: z.string().nullable(),
});
export type GithubLink = z.infer<typeof githubLinkSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  myRole: projectRoleSchema,
  inviteCode: z.string().nullable(),
  inviteRole: inviteRoleSchema,
  github: githubLinkSchema.nullable(),
  classId: z.string().uuid().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectWithMembersSchema = projectSchema.extend({
  members: z.array(projectMemberSchema),
});
export type ProjectWithMembers = z.infer<typeof projectWithMembersSchema>;

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: inviteRoleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: inviteRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const updateInviteRoleSchema = z.object({
  role: inviteRoleSchema,
});
export type UpdateInviteRoleInput = z.infer<typeof updateInviteRoleSchema>;

export const invitePreviewSchema = z.object({
  projectName: z.string(),
  ownerName: z.string(),
  role: inviteRoleSchema,
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;

export const inviteLinkSchema = z.object({
  inviteCode: z.string(),
  inviteRole: inviteRoleSchema,
});
export type InviteLink = z.infer<typeof inviteLinkSchema>;
