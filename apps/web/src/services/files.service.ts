import type { CreateFileInput, FileRecord, FileVersion, FileVersionContent, SearchResult, TrashedFile } from "@collab/shared";
import { api } from "../lib/api";

const versionsPath = (projectId: string, fileId: string) => `/projects/${projectId}/files/${fileId}/versions`;

export const filesService = {
  list: (projectId: string) => api.get<FileRecord[]>(`/projects/${projectId}/files`),
  create: (projectId: string, input: CreateFileInput) => api.post<FileRecord>(`/projects/${projectId}/files`, input),
  rename: (projectId: string, fileId: string, path: string) => api.patch<FileRecord>(`/projects/${projectId}/files/${fileId}`, { path }),
  moveToTrash: (projectId: string, fileId: string) => api.delete<void>(`/projects/${projectId}/files/${fileId}`),

  trash: (projectId: string) => api.get<TrashedFile[]>(`/projects/${projectId}/files/trash`),
  restore: (projectId: string, fileId: string) => api.post<FileRecord>(`/projects/${projectId}/files/${fileId}/restore`),
  deleteForever: (projectId: string, fileId: string) => api.delete<void>(`/projects/${projectId}/files/${fileId}/permanent`),

  versions: (projectId: string, fileId: string) => api.get<FileVersion[]>(versionsPath(projectId, fileId)),
  version: (projectId: string, fileId: string, versionId: string) =>
    api.get<FileVersionContent>(`${versionsPath(projectId, fileId)}/${versionId}`),
  restoreVersion: (projectId: string, fileId: string, versionId: string) =>
    api.post<void>(`${versionsPath(projectId, fileId)}/${versionId}/restore`),

  search: (projectId: string, term: string) =>
    api.get<SearchResult>(`/projects/${projectId}/search?q=${encodeURIComponent(term)}`),
};
