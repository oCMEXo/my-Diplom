import { z } from "zod";

export const pushGithubSchema = z.object({
  token: z.string().trim().min(10).max(255).regex(/^\S+$/, "Token must not contain spaces"),
  message: z.string().trim().min(1).max(500),
  branch: z.string().trim().max(200).optional(),
  repoUrl: z.string().trim().max(300).optional(),
  overwrite: z.boolean().optional(),
});
export type PushGithubInput = z.infer<typeof pushGithubSchema>;

export const pushResultSchema = z.object({
  repo: z.object({ owner: z.string(), name: z.string() }),
  branch: z.string(),
  newBranch: z.boolean(),
  commitSha: z.string(),
  commitUrl: z.string(),
  added: z.number().int(),
  modified: z.number().int(),
  unchanged: z.number().int(),
});
export type PushResult = z.infer<typeof pushResultSchema>;

export const githubBranchesSchema = z.object({
  token: pushGithubSchema.shape.token,
  repoUrl: z.string().trim().max(300).optional(),
});
export type GithubBranchesInput = z.infer<typeof githubBranchesSchema>;

export const githubBranchesResultSchema = z.object({
  repo: z.object({ owner: z.string(), name: z.string() }),
  defaultBranch: z.string(),
  branches: z.array(z.string()),
  canPush: z.boolean(),
});
export type GithubBranchesResult = z.infer<typeof githubBranchesResultSchema>;

export const pushPreviewRequestSchema = pushGithubSchema.pick({ token: true, repoUrl: true, branch: true, overwrite: true });
export type PushPreviewRequest = z.infer<typeof pushPreviewRequestSchema>;

export const pushPreviewSchema = z.object({
  branch: z.string(),
  newBranch: z.boolean(),
  added: z.array(z.string()),
  modified: z.array(z.string()),
  conflicts: z.array(z.string()),
  unchanged: z.number().int(),
});
export type PushPreview = z.infer<typeof pushPreviewSchema>;

export const branchListSchema = z.object({
  repo: z.object({ owner: z.string(), name: z.string() }),
  active: z.string(),
  defaultBranch: z.string(),
  branches: z.array(z.string()),
  loaded: z.array(z.string()),
});
export type BranchList = z.infer<typeof branchListSchema>;

export const branchSwitchSchema = z.object({ name: z.string().trim().min(1).max(200) });

export const branchSwitchResultSchema = z.object({
  branch: z.string(),
  imported: z.number().int(),
});
export type BranchSwitchResult = z.infer<typeof branchSwitchResultSchema>;
