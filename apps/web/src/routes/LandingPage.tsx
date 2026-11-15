import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloudOff, GraduationCap, Link2, MessagesSquare, Play, Sparkles, Users } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Button } from "../components/ui/Button";
import { ErrorNote } from "../components/ui/Field";
import { Wordmark } from "../components/ui/Logo";
import { ThemeToggle } from "../components/layout/ThemeToggle";

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-6 shadow-card">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent-ink">{icon}</span>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-base text-muted">{children}</p>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-fg">
        {number}
      </span>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-base text-muted">{children}</p>
      </div>
    </li>
  );
}

/** What a visitor who is not signed in sees at the site's address. */
export function LandingPage() {
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [trying, setTrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tryAsGuest() {
    setError(null);
    setTrying(true);
    try {
      await continueAsGuest();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start a guest session");
      setTrying(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/register" className="hidden sm:block">
            <Button variant="primary">Create an account</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Code together in the browser. <span className="text-accent-ink">One link, nothing to install.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              A shared project for classes, tutors and study groups: code, notes, a board and a chat, with everyone's
              cursor live. Students join by a link, without an account.
            </p>
            {error && (
              <div className="mt-5 max-w-md">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={() => void tryAsGuest()} disabled={trying}>
                <Sparkles size={20} />
                {trying ? "Starting…" : "Try it now as a guest"}
              </Button>
              <Link to="/register">
                <Button size="lg">Create an account</Button>
              </Link>
            </div>
            <p className="mt-3 text-sm text-faint">Free. No email needed to try it.</p>
          </div>
          <img
            src="/landing-editor.webp"
            width={1200}
            height={750}
            alt="The shared editor: code with two cursors, the chat and the people online"
            className="w-full rounded-xl border border-line shadow-pop"
          />
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature icon={<GraduationCap size={22} />} title="Made for teaching">
              Share one class link. Every student gets their own copy of the task, and you see who is working and can
              help right inside their code.
            </Feature>
            <Feature icon={<Users size={22} />} title="Really together">
              Everyone types in the same file at once and sees the others' cursors. Chat, notes and a board sit next to
              the code.
            </Feature>
            <Feature icon={<Play size={22} />} title="Run it for everyone">
              JavaScript, Python, C, C++ and Java run in a closed sandbox on the server. The whole group sees the same
              output.
            </Feature>
            <Feature icon={<CloudOff size={22} />} title="The internet drops? Keep going">
              Edits made offline stay on the device and merge without conflicts when the connection is back.
            </Feature>
            <Feature icon={<Link2 size={22} />} title="Bring your repository">
              Import a public GitHub repository by its link and push your changes back as a commit.
            </Feature>
            <Feature icon={<MessagesSquare size={22} />} title="Your data stays here">
              No ads and no tracking companies. Usage numbers stay on our server and are deleted after 180 days.
            </Feature>
          </div>
        </section>

        <section className="border-t border-line bg-surface/50">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">How a class works</h2>
              <p className="mt-2 text-base text-muted">From an empty project to a room full of working students in a few minutes.</p>
            </div>
            <ol className="space-y-5">
              <Step number={1} title="Prepare the task">
                Create a project with the starting code and a short guide, or start from an example.
              </Step>
              <Step number={2} title="Share the class link">
                In the project menu choose "Class for students" and send the link to the group.
              </Step>
              <Step number={3} title="Watch and help">
                The class page lists every student with their last edit. Open any copy to help live.
              </Step>
            </ol>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-faint">
        <span>Collab · a diploma project</span>
        <span className="flex gap-4">
          <Link to="/privacy" className="hover:text-fg">
            Data and privacy
          </Link>
          <Link to="/terms" className="hover:text-fg">
            Terms of use
          </Link>
        </span>
      </footer>
    </div>
  );
}
