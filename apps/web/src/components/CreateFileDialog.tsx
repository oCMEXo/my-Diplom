import { useState, type FormEvent } from "react";
import type { FileRecord, FileType } from "@collab/shared";
import { ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { Segmented } from "./ui/Segmented";
import { FILE_KINDS } from "./layout/ProjectNav";
import { LanguageHint } from "./Languages";

const EXAMPLE: Record<FileType, string> = { code: "main.py", doc: "README.md", board: "идеи.board" };
const HINT: Record<FileType, string> = {
  code: "",
  doc: "Markdown с живым предпросмотром — удобно для заметок и заданий.",
  board: "Полотно для схем и набросков — рисуют все сразу.",
};

export function CreateFileDialog({
  initialType,
  files,
  onClose,
  onCreate,
}: {
  initialType: FileType;
  files: FileRecord[];
  onClose: () => void;
  onCreate: (path: string, type: FileType) => Promise<void>;
}) {
  const [type, setType] = useState<FileType>(initialType);
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const trimmed = path.trim();
  const duplicate = files.some((file) => file.path === trimmed);
  const invalid = trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.includes("..");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || duplicate || invalid || creating) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(trimmed, type);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать файл");
      setCreating(false);
    }
  }

  return (
    <Modal title="Новый файл" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Segmented
          label="Тип файла"
          value={type}
          onChange={setType}
          options={(Object.keys(FILE_KINDS) as FileType[]).map((value) => {
            const kind = FILE_KINDS[value];
            return { value, label: kind.label, icon: <kind.icon size={22} className={kind.tone} /> };
          })}
        />
        <Field
          label="Имя файла"
          data-autofocus
          placeholder={EXAMPLE[type]}
          maxLength={500}
          value={path}
          onChange={(event) => setPath(event.target.value)}
          hint={
            duplicate ? <span className="text-bad">Файл с таким именем уже есть</span> : invalid ? (
              <span className="text-bad">Имя не должно начинаться или заканчиваться на «/» и содержать «..»</span>
            ) : type === "code" ? (
              <LanguageHint path={trimmed} />
            ) : (
              HINT[type]
            )
          }
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={creating}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" disabled={!trimmed || duplicate || invalid || creating}>
            {creating ? "Создаём…" : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
