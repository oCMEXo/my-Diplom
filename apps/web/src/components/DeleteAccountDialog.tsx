import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";

export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isGuest = !!user?.isGuest;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(isGuest ? {} : { password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the account");
      setDeleting(false);
    }
  }

  return (
    <Modal
      title="Delete your account?"
      description="This cannot be undone. Your account, your chat messages and the projects you own, with their files, will be deleted. You will simply leave other people's projects."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!isGuest && (
          <Field
            label="Password to confirm"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete forever"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
