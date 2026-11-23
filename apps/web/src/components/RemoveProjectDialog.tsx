import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@collab/shared";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/Button";
import { ErrorNote } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { projectsService } from "../services/projects.service";

export function RemoveProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOwner = project.myRole === "owner";

  const remove = useMutation({
    mutationFn: () =>
      isOwner ? projectsService.remove(project.id) : projectsService.removeMember(project.id, user?.id ?? ""),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["project", project.id] });
      queryClient.removeQueries({ queryKey: ["files", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
  });

  return (
    <Modal
      title={isOwner ? "Delete the project?" : "Leave the project?"}
      description={
        isOwner
          ? `“${project.name}” will be deleted for everyone, with its files and chat. This cannot be undone.`
          : `“${project.name}” disappears from your list. You can come back with an invite link. The project and its files stay for the others.`
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {remove.error && (
          <ErrorNote>{remove.error instanceof ApiError ? remove.error.message : "Could not do this"}</ErrorNote>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? "Please wait…" : isOwner ? "Delete forever" : "Leave"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
