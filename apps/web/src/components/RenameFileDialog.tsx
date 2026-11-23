import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileRecord } from "@collab/shared";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { LanguageHint } from "./Languages";
import { Modal } from "./ui/Modal";
import { filesService } from "../services/files.service";

export function RenameFileDialog({
  projectId,
  file,
  files,
  onClose,
}: {
  projectId: string;
  file: FileRecord;
  files: FileRecord[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [path, setPath] = useState(file.path);
  const trimmed = path.trim();
  const clash = trimmed !== file.path && files.some((other) => other.path === trimmed);
  const invalid = trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.includes("..");

  const rename = useMutation({
    mutationFn: () => filesService.rename(projectId, file.id, trimmed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", projectId] });
      onClose();
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (trimmed && trimmed !== file.path && !clash && !invalid) rename.mutate();
  }

  return (
    <Modal title="Rename the file" description="To move the file into a folder, put the folder in the name: src/app.js." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {rename.error && (
          <ErrorNote>{rename.error instanceof ApiError ? rename.error.message : "Could not rename the file"}</ErrorNote>
        )}
        <Field
          label="New name"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          maxLength={500}
          hint={
            clash ? (
              <span className="text-bad">A file with this name already exists</span>
            ) : invalid ? (
              <span className="text-bad">The name must not start or end with “/” or contain “..”</span>
            ) : file.type === "code" ? (
              <LanguageHint path={path} />
            ) : undefined
          }
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={rename.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!trimmed || trimmed === file.path || clash || invalid || rename.isPending}
          >
            {rename.isPending ? "Saving…" : "Rename"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
