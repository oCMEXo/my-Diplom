import { MessageSquare, Users, X } from "lucide-react";
import type { FileRecord, ProjectWithMembers } from "@collab/shared";
import { useOnlineUsers } from "../../lib/RealtimeContext";
import { cn } from "../../lib/cn";
import { ChatPanel, type ChatInsert } from "../ChatPanel";
import { MembersPanel } from "../MembersPanel";
import { IconButton } from "../ui/Button";

export type PanelTab = "chat" | "members";

export function SidePanel({
  project,
  files,
  tab,
  unread,
  chatInsert,
  onTabChange,
  onChatInsertDone,
  onFileLink,
  onInvite,
  onClose,
}: {
  project: ProjectWithMembers;
  files: FileRecord[];
  tab: PanelTab;
  unread: number;
  chatInsert: ChatInsert | null;
  onTabChange: (tab: PanelTab) => void;
  onChatInsertDone: () => void;
  onFileLink: () => void;
  /** Undefined when this person may not hand out the invitation link. */
  onInvite?: () => void;
  onClose: () => void;
}) {
  const online = useOnlineUsers();

  const tabs: { id: PanelTab; label: string; icon: typeof Users; badge?: number; tone?: string }[] = [
    { id: "chat", label: "Чат", icon: MessageSquare, badge: unread, tone: "bg-accent text-accent-fg" },
    { id: "members", label: "Участники", icon: Users, badge: online.length, tone: "bg-ok/20 text-ok" },
  ];

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-2 pr-2">
        <div role="tablist" className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon, badge, tone }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                tab === id ? "bg-raised text-fg" : "text-muted hover:text-fg",
              )}
            >
              <Icon size={15} />
              {label}
              {badge ? <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", tone)}>{badge}</span> : null}
            </button>
          ))}
        </div>
        <IconButton label="Скрыть панель" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className={cn("min-h-0 flex-1", tab !== "chat" && "hidden")}>
        <ChatPanel
          key={project.id}
          projectId={project.id}
          files={files}
          insert={chatInsert}
          onInsertDone={onChatInsertDone}
          onFileLink={onFileLink}
        />
      </div>
      <div className={cn("min-h-0 flex-1", tab !== "members" && "hidden")}>
        <MembersPanel
          projectId={project.id}
          members={project.members}
          files={files}
          isOwner={project.myRole === "owner"}
          onInvite={onInvite}
        />
      </div>
    </div>
  );
}
