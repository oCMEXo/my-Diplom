import { useState } from "react";
import { MailWarning } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/Button";

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");
  if (!user || user.isGuest || user.emailVerified !== false) return null;

  async function resend() {
    setState("sending");
    try {
      await api.post("/auth/resend-verification");
      setState("sent");
    } catch (err) {
      setState(err instanceof ApiError ? err.message : "Could not send the email");
    }
  }

  const error = !["idle", "sending", "sent"].includes(state) ? state : null;
  return (
    <div role="status" className="mb-8 flex flex-wrap items-center gap-3 rounded-xl bg-warn/12 px-4 py-3 text-base text-warn">
      <MailWarning size={20} className="shrink-0" />
      <p className="min-w-0 flex-1">
        {state === "sent"
          ? `We sent a new link to ${user.email}.`
          : error ?? `Please confirm your email: open the link we sent to ${user.email}.`}
      </p>
      {state !== "sent" && (
        <Button size="sm" onClick={resend} disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send again"}
        </Button>
      )}
    </div>
  );
}
