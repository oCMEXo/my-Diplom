import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Sparkles, TriangleAlert } from "lucide-react";
import type { ClassPreview, JoinClassResult } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { ErrorNote, Field } from "../components/ui/Field";
import { Spinner } from "../components/ui/Spinner";
import { Wordmark } from "../components/ui/Logo";
import { ThemeToggle } from "../components/layout/ThemeToggle";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Wordmark />
      <div className="w-full max-w-md animate-pop rounded-xl bg-surface p-8 shadow-card">{children}</div>
    </div>
  );
}

function Failure({ message }: { message: string }) {
  return (
    <Shell>
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bad/15 text-bad">
          <TriangleAlert size={24} />
        </span>
        <p className="text-xl font-semibold">Could not join the class</p>
        <p className="mb-5 mt-1.5 text-base text-muted">{message}</p>
        <Link to="/">
          <Button>To my projects</Button>
        </Link>
      </div>
    </Shell>
  );
}

/** A student opens the class link: a guest enters a name, a signed-in person goes straight to the copy. */
export function ClassJoinPage() {
  const { code = "" } = useParams<{ code: string }>();
  const { isAuthenticated, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const attempted = useRef(false);

  const preview = useQuery({
    queryKey: ["class-preview", code],
    queryFn: () => api.get<ClassPreview>(`/class-links/${code}`),
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !preview.data || attempted.current) return;
    attempted.current = true;
    setJoining(true);
    api
      .post<JoinClassResult>(`/class-links/${code}/join`)
      .then(({ projectId }) => navigate(`/projects/${projectId}`, { replace: true }))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not join the class");
        setJoining(false);
      });
  }, [isAuthenticated, preview.data, code, navigate]);

  async function enterAsGuest(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setJoining(true);
    try {
      await continueAsGuest(name.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in as a guest");
      setJoining(false);
    }
  }

  if (preview.isError) {
    return <Failure message={preview.error instanceof ApiError ? preview.error.message : "Could not open the class link"} />;
  }
  if (!preview.data) {
    return (
      <Shell>
        <div className="flex justify-center">
          <Spinner />
        </div>
      </Shell>
    );
  }
  if (isAuthenticated && error) return <Failure message={error} />;

  const redirect = encodeURIComponent(`/class/${code}`);
  return (
    <Shell>
      <div className="space-y-5">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent-ink">
            <GraduationCap size={28} />
          </span>
          <p className="text-base text-muted">{preview.data.teacherName} invites you to the class</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{preview.data.className}</h1>
          <p className="mt-3 text-sm text-muted">You get your own copy of the task. The teacher can see it and help you in it.</p>
        </div>

        {isAuthenticated ? (
          <p className="flex items-center justify-center gap-3 text-base text-muted">
            <Spinner size={18} /> Making your copy…
          </p>
        ) : (
          <>
            <form onSubmit={enterAsGuest} className="space-y-3">
              {error && <ErrorNote>{error}</ErrorNote>}
              <Field
                label="What is your name?"
                placeholder="For example, Vlad"
                required
                maxLength={100}
                autoComplete="given-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                hint={
                  <>
                    The teacher sees this name. You do not need an account. By joining, you accept the{" "}
                    <Link to="/terms" className="underline hover:text-fg">
                      terms of use
                    </Link>
                    .
                  </>
                }
              />
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={joining || !name.trim()}>
                <Sparkles size={18} />
                {joining ? "Joining…" : "Join the class"}
              </Button>
            </form>
            <p className="text-center text-base text-muted">
              Already have an account?{" "}
              <Link to={`/login?redirect=${redirect}`} className="font-medium text-accent-ink hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
