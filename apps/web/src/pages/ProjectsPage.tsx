import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Link as LinkIcon, Plus, Trash2, X } from "lucide-react";
import type { Project } from "@collab/shared";
import { useAuth } from "../lib/auth";
import { gradientFor, initials } from "../lib/colors";
import { CreateProjectDialog } from "../components/CreateProjectDialog";
import { RemoveProjectDialog } from "../components/RemoveProjectDialog";
import { UserMenu } from "../components/layout/UserMenu";
import { Button } from "../components/ui/Button";
import { Wordmark } from "../components/ui/Logo";
import { RoleBadge } from "../components/ui/RoleBadge";
import { Spinner } from "../components/ui/Spinner";
import { VerifyEmailBanner } from "../components/VerifyEmailBanner";
import { ClassesSection } from "../components/ClassesSection";
import { projectsService } from "../services/projects.service";

function projectCode(value: string) {
  const match = value.trim().match(/\/join\/([^/?#\s]+)/);
  return match?.[1] ?? value.trim();
}

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState("");
  const [removing, setRemoving] = useState<Project | null>(null);

  const { data: projects, isLoading, isError, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsService.list(),
  });

  function join(event: FormEvent) {
    event.preventDefault();
    const code = projectCode(link);
    if (code) navigate(`/join/${code}`);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-main/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Wordmark />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <VerifyEmailBanner />
        {notice && (
          <div role="status" className="mb-8 flex items-start gap-3 rounded-xl bg-bad/10 px-4 py-3 text-base text-bad">
            <p className="flex-1">{notice}</p>
            <button onClick={() => setNotice(null)} aria-label="Hide" className="rounded p-0.5 transition hover:bg-bad/15">
              <X size={18} />
            </button>
          </div>
        )}

        <section className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Hi, {user?.name}</h1>
            <p className="mt-2 max-w-lg text-base text-muted">
              A project is a shared place that stays. Create your own or join one with an invite link.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
            <Plus size={20} />
            New project
          </Button>
        </section>

        <form onSubmit={join} className="mb-10 flex gap-2 rounded-xl bg-surface p-2 shadow-card">
          <span className="flex items-center pl-3 text-faint">
            <LinkIcon size={20} />
          </span>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Paste an invite link to join"
            aria-label="Invite link"
            className="min-w-0 flex-1 bg-transparent px-2 text-base placeholder:text-faint focus:outline-none"
          />
          <Button type="submit" disabled={!link.trim()}>
            Join
            <ArrowRight size={18} />
          </Button>
        </form>

        <ClassesSection />

        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-faint">Your projects</h2>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && !projects && (
          <div className="py-12 text-center">
            <p className="text-base font-medium">Could not load the projects</p>
            <p className="mb-4 mt-1 text-base text-muted">It looks like there is no connection to the server.</p>
            <Button onClick={() => void refetch()}>Try again</Button>
          </div>
        )}

        {projects && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="group/card flex h-full flex-col rounded-xl bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-glow"
              >
                <Link to={`/projects/${project.id}`} className="group flex flex-1 flex-col gap-4 rounded-t-xl p-5 pb-3">
                  <div className="flex items-start justify-between">
                    <span
                      style={{ background: gradientFor(project.id) }}
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-base font-bold text-black/70"
                    >
                      {initials(project.name)}
                    </span>
                    <ArrowRight size={18} className="text-faint transition group-hover:translate-x-1 group-hover:text-accent-ink" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p title={project.name} className="truncate text-lg font-semibold">{project.name}</p>
                    <p className="mt-1 text-sm text-faint">
                      created {new Date(project.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center justify-between px-5 pb-4">
                  <RoleBadge role={project.myRole} />
                  <button
                    onClick={() => setRemoving(project)}
                    aria-label={project.myRole === "owner" ? `Delete project ${project.name}` : `Leave project ${project.name}`}
                    title={project.myRole === "owner" ? "Delete project" : "Leave project"}
                    className="touch-visible flex items-center justify-center rounded-lg p-1.5 text-faint opacity-0 transition hover:bg-bad/15 hover:text-bad focus-visible:opacity-100 group-hover/card:opacity-100"
                  >
                    {project.myRole === "owner" ? <Trash2 size={18} /> : <LogOut size={18} />}
                  </button>
                </div>
              </li>
            ))}
            <li>
              <button
                onClick={() => setCreating(true)}
                className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-faint text-base text-muted transition hover:border-accent hover:text-accent-ink"
              >
                <Plus size={24} />
                Create a project
              </button>
            </li>
          </ul>
        )}

        {projects?.length === 0 && (
          <p className="mt-6 text-center text-base text-muted">
            Nothing here yet. Create your first project or open a link someone sent you.
          </p>
        )}
      </main>

      {removing && <RemoveProjectDialog project={removing} onClose={() => setRemoving(null)} />}
      {creating && (
        <CreateProjectDialog onClose={() => setCreating(false)} onCreated={(project) => navigate(`/projects/${project.id}`)} />
      )}
    </div>
  );
}
