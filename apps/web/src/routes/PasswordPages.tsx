import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, MailCheck } from "lucide-react";
import type { AuthUser } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";
import { ErrorNote, Field } from "../components/ui/Field";
import { Spinner } from "../components/ui/Spinner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="We will email you a link to choose a new one.">
      {sent ? (
        <div role="status" className="space-y-4">
          <p className="flex items-start gap-3 rounded-xl bg-ok/10 px-4 py-3 text-base text-ok">
            <MailCheck size={20} className="mt-0.5 shrink-0" />
            If an account with this email exists, the link is on its way. It works for 1 hour.
          </p>
          <p className="text-base text-muted">No email after a few minutes? Check the spam folder or try again.</p>
          <Link to="/login" className="font-medium text-accent-ink hover:underline">
            Back to sign-in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
            {loading ? "Sending…" : "Send the link"}
          </Button>
          <p className="text-center text-base text-muted">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-accent-ink hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      tokenStore.clear();
      navigate("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set the new password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="After this you are signed out on all devices.">
      <form onSubmit={onSubmit} className="space-y-4">
        {!token && <ErrorNote>The link is not complete. Open it again from the email.</ErrorNote>}
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field
          label="New password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" disabled={loading || !token} className="w-full">
          {loading ? "Saving…" : "Save the new password"}
        </Button>
        <p className="text-center text-base text-muted">
          <Link to="/forgot-password" className="font-medium text-accent-ink hover:underline">
            Get a new link
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<{ status: "loading" | "done" } | { status: "error"; message: string }>({
    status: "loading",
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api
      .post<AuthUser>("/auth/verify-email", { token })
      .then((user) => {
        const current = tokenStore.get();
        if (current?.user.id === user.id) tokenStore.set({ ...current, user });
        setState({ status: "done" });
      })
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Could not confirm the email" }));
  }, [token]);

  return (
    <AuthShell title="Confirm your email" subtitle="This keeps your account safe and lets you reset the password.">
      {state.status === "loading" && (
        <p className="flex items-center gap-3 text-base text-muted">
          <Spinner size={18} /> Checking the link…
        </p>
      )}
      {state.status === "done" && (
        <div role="status" className="space-y-4">
          <p className="flex items-center gap-3 rounded-xl bg-ok/10 px-4 py-3 text-base text-ok">
            <CircleCheck size={20} /> Your email is confirmed.
          </p>
          <Link to="/">
            <Button variant="primary" size="lg">
              To my projects
            </Button>
          </Link>
        </div>
      )}
      {state.status === "error" && (
        <div className="space-y-4">
          <ErrorNote>{state.message}</ErrorNote>
          <p className="text-base text-muted">Sign in and press "Send again" in the reminder on your projects page.</p>
          <Link to="/" className="font-medium text-accent-ink hover:underline">
            To my projects
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
