import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";
import { ErrorNote, Field } from "../components/ui/Field";

export function LoginPage() {
  const { login, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  async function onGuest() {
    setError(null);
    setLoading(true);
    try {
      await continueAsGuest();
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in as a guest");
    } finally {
      setLoading(false);
    }
  }

  const registerLink = `/register${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue working on your projects.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex items-center gap-3 text-sm text-faint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button size="lg" onClick={onGuest} disabled={loading} className="w-full">
          <Sparkles size={18} className="text-accent-ink" />
          Continue as guest
        </Button>
        <p className="text-center text-sm text-faint">
          A guest needs no email and no password. By signing in, you accept the{" "}
          <Link to="/terms" className="underline hover:text-fg">
            terms of use
          </Link>
          .
        </p>

        <p className="pt-2 text-center text-base text-muted">
          No account?{" "}
          <Link to={registerLink} className="font-medium text-accent-ink hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
