import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Trash2, Undo2 } from "lucide-react";
import type { TrashedFile } from "@collab/shared";
import { api, ApiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { ConfirmDialog } from "../ConfirmDialog";
import { FILE_KINDS } from "./file-kinds";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until the server empties this file from the trash (at least one: it runs hourly). */
function daysLeft(purgeAt: string) {
  return Math.max(1, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / DAY_MS));
}

/**
 * Deleted files wait here until someone restores them or the retention period runs out; only the
 * owner can remove them for good earlier.
 */
export function TrashSection({ projectId, canEdit, isOwner }: { projectId: string; canEdit: boolean; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [purging, setPurging] = useState<TrashedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: trash } = useQuery({
    queryKey: ["trash", projectId],
    queryFn: () => api.get<TrashedFile[]>(`/projects/${projectId}/files/trash`),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["files", projectId] });
    queryClient.invalidateQueries({ queryKey: ["trash", projectId] });
  };

  const restore = useMutation({
    mutationFn: (file: TrashedFile) => api.post(`/projects/${projectId}/files/${file.id}/restore`),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not restore the file"),
  });

  if (!trash || trash.length === 0) return null;

  return (
    <section className="mt-4 border-t border-line pt-3">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wider text-faint transition hover:text-fg"
      >
        <ChevronRight size={16} className={cn("transition-transform", open && "rotate-90")} />
        <Trash2 size={16} />
        Trash · {trash.length}
      </button>

      {open && (
        <div className="mt-1 space-y-0.5">
          {error && <p className="px-2.5 py-1 text-sm text-bad">{error}</p>}
          <ul className="space-y-0.5">
            {trash.map((file) => {
              const kind = FILE_KINDS[file.type];
              return (
                <li key={file.id} className="group/trash flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base text-faint hover:bg-raised">
                  <kind.icon size={18} className="shrink-0 opacity-60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate line-through decoration-faint/50" title={file.path}>
                      {file.path.split("/").pop()}
                    </span>
                    <span className="block text-xs">deleted in {daysLeft(file.purgeAt)} d</span>
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => restore.mutate(file)}
                      disabled={restore.isPending}
                      aria-label={`Restore ${file.path}`}
                      title="Restore"
                      className="rounded p-1 text-muted transition hover:bg-accent/15 hover:text-accent-ink"
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setPurging(file)}
                      aria-label={`Delete forever ${file.path}`}
                      title="Delete forever"
                      className="touch-visible rounded p-1 text-faint opacity-0 transition hover:bg-bad/15 hover:text-bad focus-visible:opacity-100 group-hover/trash:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {purging && (
        <ConfirmDialog
          title="Delete forever?"
          description={`“${purging.path}” will be gone and cannot be restored.`}
          confirmLabel="Delete forever"
          danger
          action={() => api.delete(`/projects/${projectId}/files/${purging.id}/permanent`)}
          onDone={refresh}
          onClose={() => setPurging(null)}
        />
      )}
    </section>
  );
}
