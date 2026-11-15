import { useState, type FormEvent, type ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useRunMode } from "../lib/features";
import { currentRunCode, runCode } from "../lib/run-code";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";

export function RunCodeForm({ onUnlocked, onCancel }: { onUnlocked: () => void; onCancel?: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || checking) return;
    setChecking(true);
    setError(null);
    try {
      await api.post("/run-access", { code: code.trim() });
      runCode.set(code.trim());
      onUnlocked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check the code");
      setChecking(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field
        label="Access code"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        hint="The site owner knows the code: it is shown in the window where the hosting runs."
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={checking}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!code.trim() || checking}>
          <KeyRound size={16} />
          {checking ? "Checking…" : "Unlock"}
        </Button>
      </div>
    </form>
  );
}

/** Runs an action that needs the access code: asks for it once per browser, and again if the server rejects it. */
export function useRunAccess() {
  const mode = useRunMode();
  const [pending, setPending] = useState<(() => void) | null>(null);

  const ensure = (action: () => void) => {
    if (mode === "code" && !currentRunCode()) setPending(() => action);
    else action();
  };

  /** Call with a failed request's error; true when it was the code that was refused (and we asked again). */
  const refused = (error: unknown, retry: () => void) => {
    if (mode !== "code" || !(error instanceof ApiError) || error.status !== 403 || !/access code/i.test(error.message)) return false;
    runCode.clear();
    setPending(() => retry);
    return true;
  };

  const dialog: ReactNode = pending ? (
    <Modal
      title="Running code needs an access code"
      description="This site is open to everyone, so running programs and opening the terminal need the owner's code."
      onClose={() => setPending(null)}
    >
      <RunCodeForm
        onCancel={() => setPending(null)}
        onUnlocked={() => {
          const action = pending;
          setPending(null);
          action();
        }}
      />
    </Modal>
  ) : null;

  return { mode, ensure, refused, dialog };
}
