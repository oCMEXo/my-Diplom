import { Navigate, useOutletContext } from "react-router-dom";
import { GitBranch, UserPlus } from "lucide-react";
import type { FileType } from "@collab/shared";
import { FILE_KINDS } from "../components/layout/ProjectNav";
import { ProjectHeader } from "../components/layout/ProjectHeader";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";
import { pickStartFile } from "../lib/last-file";
import type { ProjectOutletContext } from "./ProjectPage";

const DESCRIPTION: Record<FileType, string> = {
  code: "An editor with highlighting, teammates' cursors and a Run button",
  doc: "Notes and tasks in Markdown with a live preview",
  board: "A canvas for diagrams, mock-ups and brainstorming",
};

export function EmptyProjectView() {
  const { project, files, canEdit, shell, createFile, importRepo } = useOutletContext<ProjectOutletContext>();

  const start = pickStartFile(project.id, files);
  if (start) return <Navigate to={`/projects/${project.id}/files/${start.id}`} replace />;

  return (
    <>
      <ProjectHeader shell={shell} title={project.name} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-2xl animate-pop text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {files.length === 0 ? "Nothing here yet" : "Choose a file"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base text-muted">
            {canEdit
              ? files.length === 0
                ? "Create the first file and invite your teammates. Everyone sees every edit at once."
                : "Or create a new one: code, a document or a board. Everyone sees every edit at once."
              : "Open any file in the list to see what the team is working on."}
          </p>

          {canEdit && (
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {(Object.keys(FILE_KINDS) as FileType[]).map((type) => {
                const kind = FILE_KINDS[type];
                return (
                  <button
                    key={type}
                    onClick={() => createFile(type)}
                    className="group flex items-center gap-4 rounded-xl bg-surface p-4 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-glow sm:flex-col sm:gap-3 sm:p-5 sm:text-center"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-raised transition group-hover:bg-accent/15">
                      <kind.icon size={24} className={cn(kind.tone)} />
                    </span>
                    <span className="min-w-0 sm:contents">
                      <span className="block font-semibold">{kind.label}</span>
                      <span className="block text-sm leading-relaxed text-muted">{DESCRIPTION[type]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {canEdit && (
              <Button variant="primary" onClick={importRepo}>
                <GitBranch size={18} />
                Import from GitHub
              </Button>
            )}
            {shell.openInvite && (
              <Button onClick={shell.openInvite}>
                <UserPlus size={18} />
                Invite people
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
