import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import type { FileRecord, FileType, Project, ProjectWithMembers } from "@collab/shared";
import { api } from "../../lib/api";
import { gradientFor, initials } from "../../lib/colors";
import { cn } from "../../lib/cn";
import { useAuth } from "../../lib/auth";
import { useRealtimeStatus } from "../../lib/RealtimeContext";
import { LogoMark } from "../ui/Logo";
import { FileTree } from "./FileTree";
import { ProjectMenu } from "./ProjectMenu";
import { TrashSection } from "./TrashSection";
import { UserMenu } from "./UserMenu";

export { FILE_KINDS } from "./file-kinds";

function ProjectRail({ activeId, onCreateProject }: { activeId: string; onCreateProject: () => void }) {
  const navigate = useNavigate();
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });

  return (
    <nav aria-label="Проекты" className="flex w-[72px] shrink-0 flex-col items-center gap-2 bg-canvas py-3">
      <Link to="/" title="Все проекты" className="rounded-lg transition hover:scale-105">
        <LogoMark size={48} />
      </Link>
      <span className="h-px w-8 bg-line" />
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-0.5">
        {projects?.map((project) => {
          const active = project.id === activeId;
          return (
            <button
              key={project.id}
              title={project.name}
              aria-label={project.name}
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="group relative flex h-12 w-12 shrink-0 items-center justify-center"
            >
              <span
                className={cn(
                  "absolute -left-3 w-1 rounded-r-full bg-fg transition-all",
                  active ? "h-10" : "h-0 group-hover:h-5",
                )}
              />
              <span
                style={{ background: gradientFor(project.id) }}
                className={cn(
                  "flex h-12 w-12 items-center justify-center text-base font-bold text-black/70 transition-all duration-200",
                  active ? "rounded-2xl" : "rounded-full group-hover:rounded-2xl",
                )}
              >
                {initials(project.name)}
              </span>
            </button>
          );
        })}
        <button
          onClick={onCreateProject}
          title="Новый проект"
          aria-label="Новый проект"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-ok transition-all hover:rounded-2xl hover:bg-ok hover:text-canvas"
        >
          <Plus size={22} />
        </button>
      </div>
    </nav>
  );
}

export function ProjectNav({
  project,
  files,
  canEdit,
  onCreateFile,
  onCreateProject,
  onInvite,
  onImport,
  onPush,
  onDeleteFile,
  onRenameFile,
  onSearch,
  onFindInFiles,
  onNavigate,
  onBranches,
}: {
  project: ProjectWithMembers;
  files: FileRecord[];
  canEdit: boolean;
  onCreateFile: (type: FileType) => void;
  onCreateProject: () => void;
  /** Undefined when this person may not hand out the invitation link. */
  onInvite?: () => void;
  onImport: () => void;
  onPush: () => void;
  onDeleteFile: (file: FileRecord) => void;
  onRenameFile: (file: FileRecord) => void;
  onSearch: () => void;
  onFindInFiles: () => void;
  onNavigate: () => void;
  onBranches: () => void;
}) {
  return (
    <div className="flex h-full">
      <ProjectRail activeId={project.id} onCreateProject={onCreateProject} />
      <aside className="flex w-64 flex-col bg-surface">
        <ProjectMenu
          project={project}
          canEdit={canEdit}
          canPush={files.length > 0}
          onInvite={onInvite}
          onBranches={onBranches}
          onImport={onImport}
          onPush={onPush}
          onFindInFiles={onFindInFiles}
        />

        {files.length > 0 && (
          <div className="px-3 pt-3">
            <button
              onClick={onSearch}
              className="flex h-9 w-full items-center gap-2 rounded-lg bg-canvas px-2.5 text-left text-sm text-muted transition hover:text-fg"
            >
              <Search size={16} />
              <span className="flex-1">Найти файл</span>
              <kbd className="whitespace-nowrap rounded border border-line px-1 text-xs text-faint">Ctrl P</kbd>
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          <div className="mb-1 flex items-center justify-between px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">Файлы</h2>
            {canEdit && (
              <button
                onClick={() => onCreateFile("code")}
                aria-label="Создать файл"
                title="Создать файл"
                className="rounded p-1 text-faint transition hover:bg-raised hover:text-fg"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <FileTree
            projectId={project.id}
            files={files}
            canEdit={canEdit}
            onNavigate={onNavigate}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
          />
          <TrashSection projectId={project.id} canEdit={canEdit} isOwner={project.myRole === "owner"} />
        </div>

        <UserPanel />
      </aside>
    </div>
  );
}

/** The bottom of the sidebar, as in Discord: who you are and whether you are connected. */
function UserPanel() {
  const { user } = useAuth();
  const status = useRealtimeStatus();
  if (!user) return null;
  const state =
    status === "open"
      ? { text: "в сети", dot: "bg-ok" }
      : status === "connecting"
        ? { text: "подключение…", dot: "bg-warn" }
        : { text: "нет связи", dot: "bg-faint" };
  return (
    <div className="flex h-[3.75rem] shrink-0 items-center gap-2.5 bg-canvas/60 px-2">
      <UserMenu placement="above" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p role="status" className="flex items-center gap-1.5 text-xs text-muted">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", state.dot)} />
          {state.text}
        </p>
      </div>
    </div>
  );
}
