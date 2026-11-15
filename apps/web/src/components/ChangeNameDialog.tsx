import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";

export function ChangeNameDialog({ onClose }: { onClose: () => void }) {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateName(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the name");
      setSaving(false);
    }
  }

  return (
    <Modal title="What is your name?" description="Other members see this name in the chat, on your cursor and in the member list." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex items-center gap-4">
          {user && <Avatar id={user.id} name={name || "?"} size="lg" />}
          <div className="flex-1">
            <Field label="Name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
