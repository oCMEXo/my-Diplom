import type { ReactNode } from "react";
import { Cloud, CloudOff, Menu, PanelRight, UserPlus } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useFollowing, useOnlineUsers } from "../../lib/RealtimeContext";
import { cn } from "../../lib/cn";
import { Avatar } from "../ui/Avatar";
import { Button, IconButton } from "../ui/Button";

export type SyncStatus = "connecting" | "connected" | "offline";

export interface ShellActions {
  openNav: () => void;
  togglePanel: () => void;
  panelOpen: boolean;
  /** Undefined when this person may not hand out the invitation link. */
  openInvite?: () => void;
  /** Opens the chat with this text added to the message being written. */
  shareInChat: (text: string) => void;
  unread: number;
}

export function SyncPill({ status }: { status: SyncStatus }) {
  const config = {
    connected: { label: "Синхронизировано", tone: "hidden bg-ok/12 text-ok sm:inline-flex", icon: Cloud },
    connecting: { label: "Подключение…", tone: "inline-flex bg-warn/12 text-warn", icon: Cloud },
    offline: { label: "Офлайн — правки сохранятся локально", tone: "inline-flex bg-warn/12 text-warn", icon: CloudOff },
  }[status];
  return (
    <span
      role="status"
      title={config.label}
      className={cn("items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", config.tone)}
    >
      <config.icon size={13} />
      {/* On a phone the icon alone says it: the header has no room for the sentence. */}
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}

const MAX_AVATARS = 4;

/** Who is here now; a click on somebody else starts or stops following them. */
function OnlineAvatars() {
  const online = useOnlineUsers();
  const { user } = useAuth();
  const { following, follow } = useFollowing();
  if (online.length === 0) return null;
  const shown = online.slice(0, MAX_AVATARS);
  const rest = online.length - shown.length;

  return (
    <span className="hidden items-center -space-x-2 sm:flex" title={`Сейчас здесь: ${online.map((person) => person.name).join(", ")}`}>
      {shown.map((person) => {
        if (person.id === user?.id) return <Avatar key={person.id} id={person.id} name={person.name} size="sm" ring />;
        const active = following === person.id;
        const label = active ? `Перестать следить: ${person.name}` : `Следить за: ${person.name}`;
        return (
          <button
            key={person.id}
            onClick={() => follow(active ? null : person.id)}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "relative rounded-full transition hover:z-10 hover:-translate-y-0.5 focus-visible:z-10",
              active && "z-10 ring-2 ring-accent ring-offset-1 ring-offset-surface",
            )}
          >
            <Avatar id={person.id} name={person.name} title={label} size="sm" ring />
          </button>
        );
      })}
      {rest > 0 && (
        <span className="z-10 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-raised px-1 text-[10px] font-semibold text-muted ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </span>
  );
}

export function ProjectHeader({
  shell,
  icon,
  title,
  badge,
  status,
  actions,
}: {
  shell: ShellActions;
  icon?: ReactNode;
  title: string;
  badge?: ReactNode;
  status?: SyncStatus;
  actions?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <IconButton label="Меню проекта" onClick={shell.openNav} className="lg:hidden">
        <Menu size={19} />
      </IconButton>
      {/* The name must stay readable however many buttons the page puts on the right. */}
      <div className="flex min-w-[6rem] items-center gap-2.5">
        {icon}
        <h2 title={title} className="truncate text-sm font-semibold">
          {title}
        </h2>
        {badge}
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {status && <SyncPill status={status} />}
        {actions}
        <OnlineAvatars />
        {shell.openInvite && (
          <Button size="sm" onClick={shell.openInvite} className="hidden md:inline-flex">
            <UserPlus size={14} />
            Пригласить
          </Button>
        )}
        <span className="relative inline-flex">
          <IconButton
            label={
              shell.unread
                ? `Новых сообщений в чате: ${shell.unread}`
                : shell.panelOpen
                  ? "Скрыть чат и участников"
                  : "Показать чат и участников"
            }
            onClick={shell.togglePanel}
            active={shell.panelOpen}
          >
            <PanelRight size={18} />
          </IconButton>
          {shell.unread > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg"
            >
              {shell.unread > 9 ? "9+" : shell.unread}
            </span>
          )}
        </span>
      </div>
    </header>
  );
}
