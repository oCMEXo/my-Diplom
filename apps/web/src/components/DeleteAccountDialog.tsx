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
      setError(err instanceof ApiError ? err.message : "Не удалось удалить аккаунт");
      setDeleting(false);
    }
  }

  return (
    <Modal
      title="Удалить аккаунт?"
      description="Это нельзя отменить. Удалятся ваш аккаунт, ваши сообщения в чатах и проекты, которыми вы владеете, вместе с их файлами. Из чужих проектов вы просто выйдете."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!isGuest && (
          <Field
            label="Пароль, чтобы подтвердить"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Отмена
          </Button>
          <Button type="submit" variant="danger" disabled={deleting}>
            {deleting ? "Удаляем…" : "Удалить навсегда"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
