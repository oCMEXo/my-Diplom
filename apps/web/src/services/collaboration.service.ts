import {
  MESSAGE_PAGE_SIZE,
  type ClassDetail,
  type Classroom,
  type ClassPreview,
  type Features,
  type GithubBranchesInput,
  type GithubBranchesResult,
  type JoinClassResult,
  type Message,
  type PushGithubInput,
  type PushPreview,
  type PushPreviewRequest,
  type PushResult,
  type TerminalTicket,
} from "@collab/shared";
import { api } from "../lib/api";

export const messagesService = {
  latest: (projectId: string) => api.get<Message[]>(`/projects/${projectId}/messages?limit=${MESSAGE_PAGE_SIZE}`),
  before: (projectId: string, messageId: string) =>
    api.get<Message[]>(`/projects/${projectId}/messages?limit=${MESSAGE_PAGE_SIZE}&before=${messageId}`),
  send: (projectId: string, body: string) => api.post<Message>(`/projects/${projectId}/messages`, { body }),
};

export const runsService = {
  features: () => api.get<Features>("/features"),
  checkAccessCode: (code: string) => api.post<void>("/run-access", { code }),
  run: (projectId: string, fileId: string, code: string) => api.post<{ runId: string }>(`/projects/${projectId}/files/${fileId}/run`, { code }),
  stop: (projectId: string, runId: string) => api.post<void>(`/projects/${projectId}/runs/${runId}/stop`),
  openTerminal: (projectId: string) => api.post<TerminalTicket>(`/projects/${projectId}/terminal`),
};

export const githubService = {
  branches: (projectId: string, input: GithubBranchesInput) =>
    api.post<GithubBranchesResult>(`/projects/${projectId}/github/branches`, input),
  preview: (projectId: string, input: PushPreviewRequest) => api.post<PushPreview>(`/projects/${projectId}/github/preview`, input),
  push: (projectId: string, input: PushGithubInput) => api.post<PushResult>(`/projects/${projectId}/github/push`, input),
};

export const classesService = {
  list: () => api.get<Classroom[]>("/classes"),
  get: (classId: string) => api.get<ClassDetail>(`/classes/${classId}`),
  createFromProject: (projectId: string) => api.post<Classroom>(`/projects/${projectId}/class`, {}),
  regenerateLink: (classId: string) => api.post<Classroom>(`/classes/${classId}/regenerate-link`),
  remove: (classId: string) => api.delete<void>(`/classes/${classId}`),
  preview: (code: string) => api.get<ClassPreview>(`/class-links/${code}`),
  join: (code: string) => api.post<JoinClassResult>(`/class-links/${code}/join`),
};
