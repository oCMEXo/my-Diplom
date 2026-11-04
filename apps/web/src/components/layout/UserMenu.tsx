import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Moon, Pencil, Save, Shield, Sun, Trash2 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ChangeNameDialog } from "../ChangeNameDialog";
import { DeleteAccountDialog } from "../DeleteAccountDialog";
import { UpgradeGuestDialog } from "../UpgradeGuestDialog";
import { cn } from "../../lib/cn";

type Dialog = "rename" | "upgrade" | "delete" | "guest-logout";

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-base text-muted transition hover:bg-raised hover:text-fg";

export function UserMenu({ placement = "below" }: { placement?: "below" | "above-right" }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  function show(next: Dialog) {
    setOpen(false);
    setDialog(next);
  }

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Меню профиля"
        aria-expanded={open}
        className="rounded-full transition hover:ring-2 hover:ring-accent/50"
      >
        <Avatar id={user.id} name={user.name} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-64 rounded-lg bg-surface p-1.5 shadow-pop animate-pop",
            placement === "below" ? "right-0 top-full mt-2" : "bottom-0 left-full ml-3",
          )}
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar id={user.id} name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-base font-medium">{user.name}</p>
              <p className="text-sm text-muted">{user.isGuest ? "Гость · без регистрации" : "Аккаунт"}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          {user.isGuest && (
            <button role="menuitem" onClick={() => show("upgrade")} className={cn(ITEM, "text-fg")}>
              <Save size={18} className="text-accent-ink" />
              Сохранить аккаунт
            </button>
          )}
          <button role="menuitem" onClick={() => show("rename")} className={ITEM}>
            <Pencil size={18} />
            Изменить имя
          </button>
          <button role="menuitem" onClick={toggle} className={ITEM}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
          <Link role="menuitem" to="/privacy" className={ITEM}>
            <Shield size={18} />
            Данные и приватность
          </Link>
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            onClick={() => (user.isGuest ? show("guest-logout") : logout())}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-base text-bad transition hover:bg-bad/10"
          >
            <LogOut size={18} />
            Выйти
          </button>
          <button
            role="menuitem"
            onClick={() => show("delete")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-base text-bad transition hover:bg-bad/10"
          >
            <Trash2 size={18} />
            Удалить аккаунт
          </button>
        </div>
      )}
      {dialog === "rename" && <ChangeNameDialog onClose={() => setDialog(null)} />}
      {dialog === "upgrade" && <UpgradeGuestDialog onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteAccountDialog onClose={() => setDialog(null)} />}
      {dialog === "guest-logout" && (
        <Modal
          title="Выйти из гостевого аккаунта?"
          description="У гостя нет ни почты, ни пароля, поэтому войти снова не получится. Вы потеряете доступ к проектам, в которых сейчас участвуете. Чтобы этого не случилось, сохраните аккаунт."
          onClose={() => setDialog(null)}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="danger" onClick={logout}>
              Всё равно выйти
            </Button>
            <Button variant="primary" onClick={() => setDialog("upgrade")} data-autofocus>
              Сохранить аккаунт
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
