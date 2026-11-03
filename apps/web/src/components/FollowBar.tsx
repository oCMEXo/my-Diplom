import { useEffect, useRef } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { useFollowing, useOnlineUsers, useRealtimeStatus } from "../lib/RealtimeContext";
import { Button } from "./ui/Button";

/** While following somebody, goes to the files they open and says how to stop. */
export function FollowBar({ projectId }: { projectId: string }) {
  const { following, follow } = useFollowing();
  const online = useOnlineUsers();
  const status = useRealtimeStatus();
  const navigate = useNavigate();
  const currentFile = useMatch("/projects/:projectId/files/:fileId")?.params.fileId;
  const person = online.find((user) => user.id === following);
  const theirFile = person?.fileId ?? null;
  const lastVisited = useRef<string | null>(null);

  useEffect(() => {
    if (!following) return;
    lastVisited.current = theirFile;
    if (theirFile && theirFile !== currentFile) navigate(`/projects/${projectId}/files/${theirFile}`);
    // Only their moves lead here: when this person moves, the effect below ends the following instead.
  }, [following, theirFile, projectId, navigate]);

  // Opening another file by hand means this person wants to look at something else.
  useEffect(() => {
    if (following && lastVisited.current && currentFile && currentFile !== lastVisited.current) follow(null);
  }, [currentFile]);

  // They left the project. During a reconnect the list is simply out of date.
  useEffect(() => {
    if (following && status === "open" && !person) follow(null);
  }, [following, status, person, follow]);

  useEffect(() => {
    if (!following) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") follow(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [following, follow]);

  if (!following || !person) return null;

  return (
    <div role="status" className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-accent/15 px-3 text-sm sm:px-4">
      <Eye size={15} className="shrink-0 text-accent-ink" />
      <span className="min-w-0 truncate">
        Вы следите за: <b className="font-semibold">{person.name}</b>
      </span>
      <Button size="sm" variant="ghost" onClick={() => follow(null)} className="ml-auto shrink-0">
        Перестать (Esc)
      </Button>
    </div>
  );
}
