import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileRecord } from "@collab/shared";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { filesService } from "../services/files.service";

export function DeleteFileDialog({
  projectId,
  file,
  onClose,
  onDeleted,
}: {
  projectId: string;
  file: FileRecord;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => filesService.moveToTrash(projectId, file.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", projectId] });
      queryClient.invalidateQueries({ queryKey: ["trash", projectId] });
      onDeleted();
    },
  });

  return (
    <Modal
      title="Move the file to the trash?"
      description={`“${file.path}” disappears for everyone in the project, but stays in the trash, so you can restore it.`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {remove.error && (
          <ErrorNote>{remove.error instanceof ApiError ? remove.error.message : "Could not delete the file"}</ErrorNote>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? "Moving…" : "Move to trash"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
