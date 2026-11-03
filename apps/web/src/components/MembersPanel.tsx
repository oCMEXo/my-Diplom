import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, UserMinus, UserPlus } from "lucide-react";
import type { FileRecord, InviteRole, PresenceUser, ProjectMember } from "@collab/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";
import { useFollowing, useOnlineUsers } from "../lib/RealtimeContext";
import { ConfirmDialog } from "./ConfirmDialog";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { RoleBadge } from "./ui/RoleBadge";

function FollowButton({ person }: { person: PresenceUser }) {
  const { following, follow } = useFollowing();
  const active = following === person.id;
  const label = active ? `Перестать следить: ${person.name}` : `Следить за: ${person.name}`;
  return (
    <button
      onClick={() => follow(active ? null : person.id)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "shrink-0 rounded p-1 transition",
        active ? "bg-accent/15 text-accent-ink" : "text-muted hover:bg-raised hover:text-fg",
      )}
    >
      <Eye size={14} />
    </button>
  );
}

export function MembersPanel({
  projectId,
  members,
  files,
  isOwner,
  onInvite,
}: {
  projectId: string;
  members: ProjectMember[];
  files: FileRecord[];
  isOwner: boolean;
  onInvite?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const online = useOnlineUsers();
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const onlineById = new Map(online.map((person) => [person.id, person]));
  const sorted = [...members].sort(
    (a, b) => Number(onlineById.has(b.userId)) - Number(onlineById.has(a.userId)) || a.name.localeCompare(b.name),
  );
  // Guests who came through an invite link are in the project's presence list too.
  const memberIds = new Set(members.map((member) => member.userId));
  const visitors = online.filter((person) => !memberIds.has(person.id));

  /** Which file a participant has open, as a line under the name. */
  function whereIs(person: PresenceUser | undefined) {
    const path = files.find((file) => file.id === person?.fileId)?.path;
    if (!path) return null;
    return (
      <p title={path} className="truncate text-xs text-muted">
        {path.split("/").pop()}
      </p>
    );
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: InviteRole }) =>
      api.patch(`/projects/${projectId}/members/${userId}`, { role }),
    onSuccess: refresh,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {sorted.map((member) => {
            const manageable = isOwner && member.role !== "owner";
            const person = onlineById.get(member.userId);
            return (
              <li key={member.userId} className="group/member flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-raised/60">
                <Avatar id={member.userId} name={member.name} online={!!person} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.name}
                    {member.userId === user?.id && <span className="ml-1.5 text-xs font-normal text-faint">это вы</span>}
                  </p>
                  {whereIs(person)}
                </div>
                {person && member.userId !== user?.id && <FollowButton person={person} />}
                {manageable ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={member.role}
                      onChange={(event) => changeRole.mutate({ userId: member.userId, role: event.target.value as InviteRole })}
                      aria-label={`Роль: ${member.name}`}
                      className="rounded-md border border-line bg-canvas px-1.5 py-1 text-[11px] text-muted transition focus:border-accent focus:outline-none"
                    >
                      <option value="editor">редактор</option>
                      <option value="viewer">наблюдатель</option>
                    </select>
                    <button
                      onClick={() => setRemoving(member)}
                      aria-label={`Убрать из проекта: ${member.name}`}
                      title="Убрать из проекта"
                      className="touch-visible rounded p-1 text-faint opacity-0 transition hover:bg-bad/15 hover:text-bad focus-visible:opacity-100 group-hover/member:opacity-100"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ) : (
                  <RoleBadge role={member.role} />
                )}
              </li>
            );
          })}
          {visitors.map((person) => (
            <li key={person.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-raised/60">
              <Avatar id={person.id} name={person.name} online />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {person.name}
                  {person.isGuest && <span className="ml-1.5 text-xs font-normal text-faint">гость</span>}
                </p>
                {whereIs(person)}
              </div>
              {person.id !== user?.id && <FollowButton person={person} />}
            </li>
          ))}
        </ul>
      </div>
      {onInvite && (
        <div className="border-t border-line p-3">
          <Button className="w-full" onClick={onInvite}>
            <UserPlus size={15} />
            Пригласить
          </Button>
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title="Убрать из проекта?"
          description={`${removing.name}: доступ к проекту пропадёт сразу, открытые вкладки закроются. Старая ссылка-приглашение тоже перестанет работать, поэтому остальным новичкам понадобится новая.`}
          confirmLabel="Убрать"
          danger
          action={() => api.delete(`/projects/${projectId}/members/${removing.userId}`)}
          onDone={refresh}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
