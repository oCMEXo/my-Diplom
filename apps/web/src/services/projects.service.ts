import type {
  BranchList,
  BranchSwitchResult,
  CreateProjectInput,
  ImportResult,
  InviteLink,
  InvitePreview,
  InviteRole,
  Project,
  ProjectWithMembers,
} from "@collab/shared";
import { api } from "../lib/api";

export const projectsService = {
  list: () => api.get<Project[]>("/projects"),
  get: (projectId: string) => api.get<ProjectWithMembers>(`/projects/${projectId}`),
  create: (input: CreateProjectInput) => api.post<Project>("/projects", input),
  remove: (projectId: string) => api.delete<void>(`/projects/${projectId}`),
  exportZip: (projectId: string) => api.download(`/projects/${projectId}/export`),

  regenerateInvite: (projectId: string) => api.post<InviteLink>(`/projects/${projectId}/invite/regenerate`),
  setInviteRole: (projectId: string, role: InviteRole) => api.patch<InviteLink>(`/projects/${projectId}/invite`, { role }),
  invitePreview: (code: string) => api.get<InvitePreview>(`/join/${code}`),
  joinByInvite: (code: string) => api.post<Project>(`/join/${code}`),

  inviteMember: (projectId: string, email: string, role: InviteRole) =>
    api.post<void>(`/projects/${projectId}/members`, { email, role }),
  setMemberRole: (projectId: string, userId: string, role: InviteRole) =>
    api.patch<void>(`/projects/${projectId}/members/${userId}`, { role }),
  removeMember: (projectId: string, userId: string) => api.delete<void>(`/projects/${projectId}/members/${userId}`),

  importGithub: (projectId: string, url: string) => api.post<ImportResult>(`/projects/${projectId}/import/github`, { url }),
  branches: (projectId: string) => api.get<BranchList>(`/projects/${projectId}/branches`),
  switchBranch: (projectId: string, name: string) => api.post<BranchSwitchResult>(`/projects/${projectId}/branch`, { name }),
};
