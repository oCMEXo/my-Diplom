import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, GitBranch } from "lucide-react";
import { IMPORT_LIMITS, type ImportResult, type ProjectWithMembers } from "@collab/shared";
import { repoSlug } from "../lib/github-url";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { projectsService } from "../services/projects.service";

export function describeSkipped(skipped: ImportResult["skipped"]) {
  const parts: string[] = [];
  if (skipped.existing) parts.push(`already in the project: ${skipped.existing}`);
  if (skipped.ignored) parts.push(`tool files and dependencies: ${skipped.ignored}`);
  if (skipped.binary) parts.push(`binary: ${skipped.binary}`);
  if (skipped.tooLarge) parts.push(`too large: ${skipped.tooLarge}`);
  if (skipped.overLimit) parts.push(`over the limit: ${skipped.overLimit}`);
  return parts;
}

export function ImportGithubDialog({ project, onClose }: { project: ProjectWithMembers; onClose: () => void }) {
  const projectId = project.id;
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");

  const importRepo = useMutation({
    mutationFn: (value: string) => projectsService.importGithub(projectId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files", projectId] }),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (url.trim() && !importRepo.isPending) importRepo.mutate(url.trim());
  }

  const linkedSlug = project.github ? `${project.github.owner}/${project.github.repo}`.toLowerCase() : null;
  const typedSlug = repoSlug(url);
  const mixesRepos = !!linkedSlug && !!typedSlug && typedSlug !== linkedSlug;
  const result = importRepo.data;
  const skipped = result ? describeSkipped(result.skipped) : [];

  return (
    <Modal
      title="Import from GitHub"
      description="Paste a link to a public repository. The files appear in the project, and you can invite people right away."
      onClose={onClose}
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-ok/10 p-4 text-base">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-ok" />
            <div>
              <p className="font-medium">
                {result.repo.owner}/{result.repo.name}: files added: {result.imported}
              </p>
              {skipped.length > 0 && <p className="mt-1 text-muted">Skipped: {skipped.join("; ")}.</p>}
              {result.skippedPaths.length > 0 && (
                <p className="mt-1 break-words font-mono text-sm text-faint">{result.skippedPaths.join(", ")}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {importRepo.error && (
            <ErrorNote>
              {importRepo.error instanceof ApiError ? importRepo.error.message : "Could not import the repository"}
            </ErrorNote>
          )}
          {mixesRepos && (
            <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-base text-warn">
              This project is linked to {project.github!.owner}/{project.github!.repo}. Files from another repository
              will be added and mixed with the current ones. For another repository, better create a new project.
            </p>
          )}
          <Field
            label="Repository link"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={importRepo.isPending}
            hint={`A link to a branch works too (…/tree/dev). Only text files are copied: up to ${IMPORT_LIMITS.maxFiles} files, each up to ${IMPORT_LIMITS.maxFileBytes / 1024} KB. node_modules, build output and binary files are skipped.`}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={importRepo.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!url.trim() || importRepo.isPending}>
              <GitBranch size={18} />
              {importRepo.isPending ? "Loading…" : "Import"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
