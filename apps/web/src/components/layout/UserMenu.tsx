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

export function UserMenu({ placement = "below" }: { placement?: "below" | "above" }) {
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
        aria-label="Profile menu"
        aria-expanded={open}
        className="rounded-full transition hover:ring-2 hover:ring-accent/50"
      >
        <Avatar id={user.id} name={user.name} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-60 rounded-lg bg-surface p-1.5 shadow-pop animate-pop",
            placement === "below" ? "right-0 top-full mt-2" : "bottom-full left-0 mb-2",
          )}
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar id={user.id} name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-base font-medium">{user.name}</p>
              <p className="text-sm text-muted">{user.isGuest ? "Guest · no account" : "Account"}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          {user.isGuest && (
            <button role="menuitem" onClick={() => show("upgrade")} className={cn(ITEM, "text-fg")}>
              <Save size={18} className="text-accent-ink" />
              Save your account
            </button>
          )}
          <button role="menuitem" onClick={() => show("rename")} className={ITEM}>
            <Pencil size={18} />
            Change name
          </button>
          <button role="menuitem" onClick={toggle} className={ITEM}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
          <Link role="menuitem" to="/privacy" className={ITEM}>
            <Shield size={18} />
            Data and privacy
          </Link>
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            onClick={() => (user.isGuest ? show("guest-logout") : logout())}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-base text-bad transition hover:bg-bad/10"
          >
            <LogOut size={18} />
            Sign out
          </button>
          <button
            role="menuitem"
            onClick={() => show("delete")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-base text-bad transition hover:bg-bad/10"
          >
            <Trash2 size={18} />
            Delete account
          </button>
        </div>
      )}
      {dialog === "rename" && <ChangeNameDialog onClose={() => setDialog(null)} />}
      {dialog === "upgrade" && <UpgradeGuestDialog onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteAccountDialog onClose={() => setDialog(null)} />}
      {dialog === "guest-logout" && (
        <Modal
          title="Sign out of the guest account?"
          description="A guest has no email and no password, so you cannot sign in again. You will lose access to the projects you are in now. To keep them, save your account."
          onClose={() => setDialog(null)}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="danger" onClick={logout}>
              Sign out anyway
            </Button>
            <Button variant="primary" onClick={() => setDialog("upgrade")} data-autofocus>
              Save your account
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
