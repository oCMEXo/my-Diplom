import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";
import { ErrorNote, Field } from "../components/ui/Field";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ name, email, password });
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign up");
    } finally {
      setLoading(false);
    }
  }

  const loginLink = `/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <AuthShell title="Create an account" subtitle="Your projects, invitations and history in one place.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-faint">
          By creating an account, you accept the{" "}
          <Link to="/terms" className="underline hover:text-fg">
            terms of use
          </Link>
          .
        </p>
        <p className="pt-2 text-center text-base text-muted">
          Already have an account?{" "}
          <Link to={loginLink} className="font-medium text-accent-ink hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
