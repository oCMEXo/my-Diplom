import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { IconButton } from "./Button";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

let openDialogs = 0;

/** While a dialog is open, the page under it can be neither clicked nor reached with the keyboard. */
function setPageInert(inert: boolean) {
  const page = document.getElementById("root");
  if (page) page.inert = inert;
}

export function Modal({
  title,
  description,
  onClose,
  children,
  width = "max-w-md",
  side,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  /** A full-height panel at the right edge (its content can then fill the height), instead of a centred card. */
  side?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      // With a confirmation open over this dialog, the keys belong to the one on top.
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !panel.current) return;
      // Tab goes round inside the dialog.
      const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!first || !last) return;
      if (!panel.current.contains(active) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);
    openDialogs += 1;
    setPageInert(true);
    // A dialog can name the field to start in; otherwise the first control gets the focus.
    (
      panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")
    )?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      openDialogs -= 1;
      if (openDialogs === 0) setPageInert(false);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fade-in",
        side ? "justify-end" : "items-center justify-center p-4",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full bg-main shadow-pop",
          width,
          side
            ? "flex h-full flex-col p-4 animate-slide-in-right sm:rounded-l-xl sm:p-6"
            : "max-h-full overflow-y-auto rounded-xl p-6 animate-pop",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-base text-muted">{description}</p>}
          </div>
          <IconButton label="Закрыть" onClick={onClose} data-close>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
