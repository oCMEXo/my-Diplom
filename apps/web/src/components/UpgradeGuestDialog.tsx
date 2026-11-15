import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";

/** A guest adds an e-mail and a password to the same account, so projects and the chat history stay. */
export function UpgradeGuestDialog({ onClose }: { onClose: () => void }) {
  const { upgradeGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await upgradeGuest({ email: email.trim(), password });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the account");
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Save your account"
      description="Add an email and a password to come back to your projects from any device. Your projects and chat stay."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
