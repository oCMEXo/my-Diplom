import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, Pencil, RefreshCw } from "lucide-react";
import type { InviteLink, InviteRole, ProjectWithMembers } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { Segmented } from "./ui/Segmented";

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
    mutationFn: () => api.post<InviteLink>(`/projects/${project.id}/invite/regenerate`),
    onSuccess: refresh,
  });
  const changeRole = useMutation({
    mutationFn: (role: InviteRole) => api.patch<InviteLink>(`/projects/${project.id}/invite`, { role }),
    onSuccess: refresh,
  });
  const inviteByEmail = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/members`, { email, role: emailRole }),
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
      title="Пригласить в проект"
      description="Любой, у кого есть ссылка, попадёт в проект — даже без регистрации, гостем."
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              aria-label="Ссылка-приглашение"
              onClick={(event) => event.currentTarget.select()}
              className="field font-mono text-sm"
            />
            <Button variant="primary" onClick={copyLink} className="shrink-0 sm:w-36">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>

          {copyFailed && <ErrorNote>Браузер не дал скопировать. Выделите ссылку в поле и скопируйте её вручную.</ErrorNote>}
          {(regenerate.error ?? changeRole.error) && <ErrorNote>Не удалось изменить ссылку. Попробуйте ещё раз.</ErrorNote>}

          {isOwner ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Что смогут делать пришедшие по ссылке:</p>
              <Segmented
                label="Роль по ссылке"
                value={project.inviteRole}
                onChange={(role) => changeRole.mutate(role)}
                options={[
                  { value: "editor", label: "Редактировать", icon: <Pencil size={20} /> },
                  { value: "viewer", label: "Только смотреть", icon: <Eye size={20} /> },
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
                Сделать новую ссылку (старая перестанет работать)
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              По этой ссылке участники получают роль «{project.inviteRole === "editor" ? "редактор" : "наблюдатель"}».
            </p>
          )}
        </section>

        {isOwner && (
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="text-base font-medium">Или пригласить по email</h3>
            <p className="-mt-2 text-sm text-muted">Подойдёт, если человек уже зарегистрирован.</p>
            {inviteByEmail.error && (
              <ErrorNote>
                {inviteByEmail.error instanceof ApiError ? inviteByEmail.error.message : "Не удалось пригласить"}
              </ErrorNote>
            )}
            {inviteByEmail.isSuccess && !inviteByEmail.isPending && <p className="text-sm text-ok">Участник добавлен</p>}
            <form onSubmit={submitEmail} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                aria-label="Email участника"
                className="field"
              />
              <select
                value={emailRole}
                onChange={(event) => setEmailRole(event.target.value as InviteRole)}
                aria-label="Роль"
                className="field shrink-0 sm:w-36"
              >
                <option value="editor">редактор</option>
                <option value="viewer">наблюдатель</option>
              </select>
              <Button type="submit" disabled={!email.trim() || inviteByEmail.isPending}>
                Добавить
              </Button>
            </form>
          </section>
        )}
      </div>
    </Modal>
  );
}
