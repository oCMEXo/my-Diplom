import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GitBranch } from "lucide-react";
import type { AuthResponse } from "@collab/shared";
import { api, API_URL, ApiError } from "../lib/api";
import { useFeatures } from "../lib/features";
import { tokenStore } from "../lib/tokenStore";
import { AuthShell } from "../components/layout/AuthShell";
import { ErrorNote } from "../components/ui/Field";
import { Spinner } from "../components/ui/Spinner";

export function GithubSignInButton({ redirectTo }: { redirectTo: string }) {
  const features = useFeatures();
  if (!features?.githubSignIn) return null;
  return (
    <a
      href={`${API_URL}/auth/github/start?redirect=${encodeURIComponent(redirectTo)}`}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-control text-base font-medium text-fg transition hover:bg-control-hover"
    >
      <GitBranch size={18} />
      Continue with GitHub
    </a>
  );
}

export function GithubCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    const failure = params.get("error");
    const code = params.get("code");
    if (failure || !code) {
      setError(failure ?? "The sign-in link is not complete. Please try again.");
      return;
    }
    api
      .post<AuthResponse>("/auth/github/exchange", { code })
      .then((auth) => {
        tokenStore.set(auth);
        navigate(params.get("redirect") || "/", { replace: true });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not sign in with GitHub"));
  }, [navigate]);

  return (
    <AuthShell title="Signing in with GitHub" subtitle="One moment…">
      {error ? (
        <div className="space-y-4">
          <ErrorNote>{error}</ErrorNote>
          <Link to="/login" className="font-medium text-accent-ink hover:underline">
            Back to sign-in
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-3 text-base text-muted">
          <Spinner size={18} /> Finishing the sign-in…
        </p>
      )}
    </AuthShell>
  );
}
