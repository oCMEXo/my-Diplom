import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import type { FileRecord, FileVersion, FileVersionContent } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { formatSize, versionAge, versionMoment } from "../lib/versions";
import type { EditorController } from "./CollabEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { VersionDiff } from "./VersionDiff";
import { Button } from "./ui/Button";
import { ErrorNote } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { Spinner } from "./ui/Spinner";

function useCurrentText(controller: EditorController | null) {
  const [text, setText] = useState(() => controller?.getCode() ?? "");
  useEffect(() => controller?.subscribe(setText), [controller]);
  return text;
}

export function VersionHistoryDialog({
  projectId,
  file,
  language,
  controller,
  canEdit,
  onClose,
}: {
  projectId: string;
  file: FileRecord;
  language: string;
  controller: EditorController | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const current = useCurrentText(controller);
  const base = `/projects/${projectId}/files/${file.id}/versions`;

  const versions = useQuery({
    queryKey: ["versions", file.id],
    queryFn: () => api.get<FileVersion[]>(base),
    // New versions appear while people edit, so the list is loaded again every time the dialog opens.
    refetchOnMount: "always",
  });
  const selected = versions.data?.find((version) => version.id === selectedId) ?? versions.data?.[0] ?? null;

  const content = useQuery({
    queryKey: ["version", selected?.id],
    queryFn: () => api.get<FileVersionContent>(`${base}/${selected!.id}`),
    enabled: !!selected,
    // A version never changes; its text can be large, so it is not kept in the saved cache after closing.
    staleTime: Infinity,
    gcTime: 0,
  });
  const text = content.data?.id === selected?.id ? content.data?.content : undefined;
  // Line breaks do not count: a restore gives the version the ones the file uses now.
  const same = text !== undefined && text.replace(/\r\n/g, "\n") === current.replace(/\r\n/g, "\n");

  return (
    <Modal
      side
      title="Version history"
      description={`${file.path} · a version is saved at most every 5 minutes, the last 50 are kept`}
      onClose={onClose}
      width="max-w-5xl"
    >
      {versions.isPending ? (
        <p className="flex items-center gap-2 text-base text-muted">
          <Spinner size={18} /> Loading the history…
        </p>
      ) : versions.error ? (
        <ErrorNote>{versions.error instanceof ApiError ? versions.error.message : "Could not load the history"}</ErrorNote>
      ) : !selected ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center text-base text-muted">
          <History size={28} className="text-faint" />
          No versions yet. They appear when people edit the file.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <ul className="max-h-44 shrink-0 space-y-0.5 overflow-y-auto md:max-h-none md:w-60">
            {versions.data.map((version) => (
              <li key={version.id}>
                <button
                  onClick={() => setSelectedId(version.id)}
                  aria-current={version.id === selected.id}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left transition",
                    version.id === selected.id ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
                  )}
                >
                  <span className="block text-base font-medium" title={versionMoment(version.createdAt)}>
                    {versionAge(version.createdAt)}
                  </span>
                  <span className="block truncate text-sm text-faint">
                    {version.authorName ?? "unknown author"} · {formatSize(version.size)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="flex min-h-[18rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-canvas px-3 py-2">
              <p className="min-w-0 flex-1 text-sm text-muted">
                Version from {versionMoment(selected.createdAt)}: <span className="text-bad">red</span> is only in that
                version, <span className="text-ok">green</span> is only in the current text
                {same && <span className="text-ok"> · same as the current text</span>}
              </p>
              {canEdit ? (
                <Button size="sm" variant="primary" onClick={() => setConfirming(true)} disabled={text === undefined || same}>
                  <RotateCcw size={16} />
                  Restore
                </Button>
              ) : (
                <span className="text-sm text-faint">Editors can restore versions</span>
              )}
            </div>
            <div className="relative min-h-0 flex-1">
              {content.error ? (
                <div className="p-3">
                  <ErrorNote>{content.error instanceof ApiError ? content.error.message : "Could not load the version"}</ErrorNote>
                </div>
              ) : text === undefined ? (
                <p className="flex items-center gap-2 p-3 text-base text-muted">
                  <Spinner size={18} /> Loading the version…
                </p>
              ) : (
                <VersionDiff original={text} modified={current} language={language} />
              )}
            </div>
          </section>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Restore this version?"
          description={`The file text changes for everyone to the version from ${versionMoment(selected!.createdAt)}. The current text stays in the history, so you can undo this.`}
          confirmLabel="Restore"
          pendingLabel="Restoring…"
          action={() => api.post(`${base}/${selected!.id}/restore`)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["versions", file.id] });
            onClose();
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </Modal>
  );
}
