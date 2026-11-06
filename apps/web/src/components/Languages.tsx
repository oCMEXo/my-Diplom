import { useState } from "react";
import { CircleAlert, CircleCheck, Play } from "lucide-react";
import { describeLanguage, languageCatalogue, RUNNABLE_LANGUAGES, languageName } from "@collab/shared";
import { cn } from "../lib/cn";
import { Modal } from "./ui/Modal";

const RUNNABLE_NAMES = RUNNABLE_LANGUAGES.map(languageName).join(" и ");

/** Every language the platform knows: which ones run, which ones are only highlighted. */
export function LanguageList() {
  const catalogue = languageCatalogue();
  const groups = [
    { title: "Подсветка и запуск", note: "кнопка «Запустить» и терминал", entries: catalogue.filter((entry) => entry.support === "run") },
    { title: "Только подсветка", note: "редактировать вместе можно, запустить нельзя", entries: catalogue.filter((entry) => entry.support === "highlight") },
  ];
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.title}>
          <h3 className="text-sm font-semibold">
            {group.title} <span className="font-normal text-faint">— {group.note}</span>
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {group.entries.map((entry) => (
              <li
                key={entry.language}
                title={entry.extensions.join(" ")}
                className={cn("rounded-md px-2 py-1 text-sm", entry.support === "run" ? "bg-ok/15 text-ok" : "bg-raised text-muted")}
              >
                {entry.name} <span className="font-mono text-xs opacity-75">{entry.extensions.join(" ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-faint">
        Файл с другим расширением тоже можно создать: он откроется как обычный текст, без подсветки и запуска.
      </p>
    </div>
  );
}

export function LanguagesDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Поддерживаемые языки" description="Язык файла определяется по его расширению." onClose={onClose} width="max-w-xl">
      <LanguageList />
    </Modal>
  );
}

/** What will happen to a file with this name, said while the name is typed. */
export function LanguageHint({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const info = describeLanguage(path.trim());
  const typed = path.trim() !== "";

  let message;
  if (!typed) message = <span>Язык определяется по расширению.</span>;
  else if (info.support === "run")
    message = (
      <span className="inline-flex items-center gap-1 text-ok">
        <Play size={14} className="fill-current" /> {info.name}: подсветка и запуск
      </span>
    );
  else if (info.support === "highlight")
    message = (
      <span className="inline-flex items-center gap-1">
        <CircleCheck size={14} className="text-ok" /> {info.name}: подсветка. Запускать можно только {RUNNABLE_NAMES}
      </span>
    );
  else if (info.unknown)
    message = (
      <span className="inline-flex items-start gap-1 text-warn">
        <CircleAlert size={14} className="mt-0.5 shrink-0" /> Расширение .{info.extension} не распознано: файл откроется как обычный текст, без подсветки и запуска
      </span>
    );
  else message = <span>Без расширения: файл откроется как обычный текст.</span>;

  return (
    <span className="block space-y-2">
      <span role="status" className="block">
        {message}{" "}
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="text-accent-ink underline-offset-2 hover:underline">
          Какие языки поддерживаются?
        </button>
      </span>
      {open && (
        <span className="block rounded-lg bg-canvas p-3">
          <LanguageList />
        </span>
      )}
    </span>
  );
}
