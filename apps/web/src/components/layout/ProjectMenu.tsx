import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Download, FolderDown, GitBranch, GraduationCap, LoaderCircle, TextSearch, Upload, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ProjectWithMembers } from "@collab/shared";
import { ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { saveBlob } from "../../lib/save-blob";
import { classesService } from "../../services/collaboration.service";
import { projectsService } from "../../services/projects.service";

const ROLE_NAMES = { owner: "owner", editor: "editor", viewer: "viewer" } as const;

function Item({
  icon,
  children,
  hint,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted transition hover:bg-accent hover:text-accent-fg disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint}
    </button>
  );
}

export function ProjectMenu({
  project,
  canEdit,
  canPush,
  onInvite,
  onBranches,
  onImport,
  onPush,
  onFindInFiles,
}: {
  project: ProjectWithMembers;
  canEdit: boolean;
  canPush: boolean;
  onInvite?: () => void;
  onBranches: () => void;
  onImport: () => void;
  onPush: () => void;
  onFindInFiles: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  async function downloadZip() {
    setExporting(true);
    setError(null);
    try {
      saveBlob(await projectsService.exportZip(project.id), `${project.name}.zip`);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the archive");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div ref={root} className="relative shrink-0 border-b border-line">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${project.name}: project actions`}
        className={cn(
          "flex h-14 w-full items-center gap-2 px-4 text-left transition hover:bg-raised",
          open && "bg-raised",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-base font-semibold">{project.name}</span>
        <ChevronDown size={18} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="absolute left-2 top-full z-30 mt-1 w-72 rounded-lg bg-canvas p-1.5 shadow-pop animate-pop">
          {onInvite && (
            <Item icon={<UserPlus size={18} />} onClick={choose(onInvite)}>
              Invite people
            </Item>
          )}
          {project.myRole === "owner" && !project.classId && (
            <Item
              icon={<GraduationCap size={18} />}
              onClick={() => {
                setError(null);
                classesService
                  .createFromProject(project.id)
                  .then((classroom) => navigate(`/classes/${classroom.id}`))
                  .catch((err) => setError(err instanceof ApiError ? err.message : "Could not open the class"));
              }}
            >
              Class for students
            </Item>
          )}
          {project.github && (
            <Item
              icon={<GitBranch size={18} />}
              onClick={choose(onBranches)}
              hint={<span className="max-w-[6rem] truncate font-mono text-xs">{project.github.branch ?? "—"}</span>}
            >
              Branch
            </Item>
          )}
          <Item icon={<TextSearch size={18} />} onClick={choose(onFindInFiles)} hint={<kbd className="font-mono text-xs opacity-70">Ctrl⇧F</kbd>}>
            Search text
          </Item>
          <div className="my-1 h-px bg-line" />
          {canEdit && (
            <Item icon={<FolderDown size={18} />} onClick={choose(onImport)}>
              Import from GitHub
            </Item>
          )}
          {canEdit && (
            <Item icon={<Upload size={18} />} onClick={choose(onPush)} disabled={!canPush}>
              Push to GitHub
            </Item>
          )}
          <Item
            icon={exporting ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
            onClick={() => void downloadZip()}
            disabled={exporting}
          >
            Download ZIP
          </Item>
          {error && (
            <p role="alert" className="px-2.5 py-1 text-sm text-bad">
              {error}
            </p>
          )}
          <p className="border-t border-line px-2.5 pb-1 pt-2 text-xs text-faint">Your role: {ROLE_NAMES[project.myRole]}</p>
        </div>
      )}
    </div>
  );
}
