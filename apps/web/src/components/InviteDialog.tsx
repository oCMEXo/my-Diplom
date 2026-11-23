import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, Pencil, RefreshCw } from "lucide-react";
import type { InviteRole, ProjectWithMembers } from "@collab/shared";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { Segmented } from "./ui/Segmented";
import { projectsService } from "../services/projects.service";

export function InviteDialog({ project, onClose }: { project: ProjectWithMembers; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isOwner = project.myRole === "owner";
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState<InviteRole>("editor");
  const link = `${window.location.origin}/join/${project.inviteCode}`;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project", project.id] });

  const regenerate = useMutation({
    mutationFn: () => projectsService.regenerateInvite(project.id),
    onSuccess: refresh,
  });
  const changeRole = useMutation({
    mutationFn: (role: InviteRole) => projectsService.setInviteRole(project.id, role),
    onSuccess: refresh,
  });
  const inviteByEmail = useMutation({
    mutationFn: () => projectsService.inviteMember(project.id, email, emailRole),
    onSuccess: () => {
      setEmail("");
      refresh();
    },
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (email.trim()) inviteByEmail.mutate();
  }

  return (
    <Modal
      title="Invite to the project"
      description="Anyone with the link can join the project, even as a guest without an account."
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              aria-label="Invite link"
              onClick={(event) => event.currentTarget.select()}
              className="field font-mono text-sm"
            />
            <Button variant="primary" onClick={copyLink} className="shrink-0 sm:w-36">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {copyFailed && <ErrorNote>The browser did not allow copying. Select the link in the field and copy it yourself.</ErrorNote>}
          {(regenerate.error ?? changeRole.error) && <ErrorNote>Could not change the link. Please try again.</ErrorNote>}

          {isOwner ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">What people who join by the link can do:</p>
              <Segmented
                label="Role for the link"
                value={project.inviteRole}
                onChange={(role) => changeRole.mutate(role)}
                options={[
                  { value: "editor", label: "Edit", icon: <Pencil size={20} /> },
                  { value: "viewer", label: "View only", icon: <Eye size={20} /> },
                ]}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => regenerate.mutate()}
                disabled={regenerate.isPending}
                className="!h-auto min-h-7 !whitespace-normal py-1 text-left"
              >
                <RefreshCw size={16} className={regenerate.isPending ? "shrink-0 animate-spin" : "shrink-0"} />
                Make a new link (the old one stops working)
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              People who join by this link get the role “{project.inviteRole === "editor" ? "editor" : "viewer"}”.
            </p>
          )}
        </section>

        {isOwner && (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="text-base font-medium">Or invite by email</h3>
            <p className="-mt-2 text-sm text-muted">Works if the person already has an account.</p>
            {inviteByEmail.error && (
              <ErrorNote>
                {inviteByEmail.error instanceof ApiError ? inviteByEmail.error.message : "Could not invite"}
              </ErrorNote>
            )}
            {inviteByEmail.isSuccess && !inviteByEmail.isPending && <p className="text-sm text-ok">Member added</p>}
            <form onSubmit={submitEmail} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                aria-label="Member email"
                className="field"
              />
              <select
                value={emailRole}
                onChange={(event) => setEmailRole(event.target.value as InviteRole)}
                aria-label="Role"
                className="field shrink-0 sm:w-36"
              >
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
              <Button type="submit" disabled={!email.trim() || inviteByEmail.isPending}>
                Add
              </Button>
            </form>
          </section>
        )}
      </div>
    </Modal>
  );
}
