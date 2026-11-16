import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, ExternalLink, GraduationCap, RefreshCw, Trash2, Users } from "lucide-react";
import type { ClassDetail } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { versionAge } from "../lib/versions";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ErrorScreen } from "../components/ui/ErrorScreen";
import { FullScreenLoader } from "../components/ui/Spinner";
import { ThemeToggle } from "../components/layout/ThemeToggle";

export function classLink(joinCode: string) {
  return `${window.location.origin}/class/${joinCode}`;
}

export function ClassPage() {
  const { classId = "" } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const classroom = useQuery({
    queryKey: ["class", classId],
    queryFn: () => api.get<ClassDetail>(`/classes/${classId}`),
    refetchInterval: 10_000,
  });
  const regenerate = useMutation({
    mutationFn: () => api.post(`/classes/${classId}/regenerate-link`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class", classId] }),
  });

  if (classroom.isError) {
    const missing = classroom.error instanceof ApiError && classroom.error.status === 404;
    return (
      <ErrorScreen
        title={missing ? "The class is not available" : "Could not open the class"}
        message={missing ? "The class does not exist, or you are not its teacher." : "It looks like there is no connection to the server."}
        onRetry={missing ? undefined : () => void classroom.refetch()}
      />
    );
  }
  if (!classroom.data) return <FullScreenLoader label="Opening the class…" />;

  const data = classroom.data;
  const link = classLink(data.joinCode);
  const online = data.students.filter((student) => student.online).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <Link to="/" className="inline-flex items-center gap-2 text-base text-muted hover:text-fg">
          <ArrowLeft size={18} /> All projects
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-faint">
              <GraduationCap size={16} /> Class
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.name}</h1>
            <p className="mt-2 text-base text-muted">
              Every student who opens the link gets their own copy of the task, and you are an editor in it.
            </p>
          </div>
          <Link to={`/projects/${data.taskProjectId}`}>
            <Button>
              <ExternalLink size={18} /> Edit the task
            </Button>
          </Link>
        </section>

        <section className="mb-10 rounded-xl bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-base font-medium">Link for students</h2>
          <div className="flex flex-wrap gap-2">
            <input
              readOnly
              value={link}
              aria-label="Class link"
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm"
            />
            <Button variant="primary" onClick={() => void copy()}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
            <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending} className="inline-flex items-center gap-1.5 hover:text-fg">
              <RefreshCw size={14} /> Make a new link (the old one stops working; copies stay)
            </button>
            <button onClick={() => setDeleting(true)} className="inline-flex items-center gap-1.5 text-bad hover:underline">
              <Trash2 size={14} /> Delete the class
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-faint">
            <Users size={16} /> Students · {data.studentCount}
            {online > 0 && <span className="font-normal normal-case tracking-normal text-ok">· {online} online</span>}
          </h2>
          {data.students.length === 0 ? (
            <p className="rounded-xl bg-surface px-5 py-8 text-center text-base text-muted shadow-card">
              No students yet. Send them the link above: they join with a name, no account needed.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-card">
              {data.students.map((student) => (
                <li key={student.projectId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar id={student.projectId} name={student.name} online={student.online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">
                      {student.name}
                      {student.isGuest && <span className="ml-1.5 text-sm font-normal text-faint">guest</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {student.lastEditAt ? `Last edit ${versionAge(student.lastEditAt)}` : "No edits yet"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/projects/${student.projectId}`)} aria-label={`Open the copy of ${student.name}`}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {deleting && (
        <ConfirmDialog
          title="Delete the class?"
          description="The link stops working. Students keep their copies, and you stay an editor in them."
          confirmLabel="Delete the class"
          danger
          action={() => api.delete(`/classes/${classId}`)}
          onClose={() => setDeleting(false)}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ["classes"] });
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
