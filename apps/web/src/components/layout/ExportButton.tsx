import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { saveBlob } from "../../lib/save-blob";

/** Everyone in the project, viewers too, can take a copy of its text files with them. */
export function ExportButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      saveBlob(await api.download(`/projects/${projectId}/export`), `${projectName}.zip`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось скачать архив");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => void download()}
        disabled={busy}
        title="Текстовые файлы текущей ветки одним архивом. Доски сохраняются отдельно: PNG или SVG на самой доске."
        className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-muted transition hover:bg-raised hover:text-fg disabled:opacity-60"
      >
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
        <span className="flex-1 text-left">{busy ? "Собираем архив…" : "Скачать ZIP"}</span>
      </button>
      {error && (
        <p role="alert" className="px-1 text-sm text-bad">
          {error}
        </p>
      )}
    </>
  );
}
