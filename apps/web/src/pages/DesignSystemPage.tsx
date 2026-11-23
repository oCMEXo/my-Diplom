import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Code2, FileText, Folder, LayoutDashboard, Pencil, Play, Plus, Send, Terminal, Trash2 } from "lucide-react";
import { useTheme } from "../lib/theme";
import { LogoMark, Wordmark } from "../components/ui/Logo";
import { Button, IconButton } from "../components/ui/Button";
import { ErrorNote, Field } from "../components/ui/Field";
import { RoleBadge } from "../components/ui/RoleBadge";
import { Avatar } from "../components/ui/Avatar";
import { Segmented } from "../components/ui/Segmented";
import { Spinner } from "../components/ui/Spinner";
import { ThemeToggle } from "../components/layout/ThemeToggle";

const SURFACES = ["canvas", "surface", "main", "raised", "selected", "control"] as const;
const TEXTS = ["fg", "muted", "faint", "accent-ink", "ok", "bad", "warn"] as const;
const BACKGROUNDS = ["main", "surface", "canvas"] as const;

const TYPE_SCALE = [
  { name: "Display", className: "text-4xl font-bold", spec: "36 / 40 px, Bold" },
  { name: "Title", className: "text-2xl font-semibold", spec: "24 / 32 px, Semi Bold" },
  { name: "Heading", className: "text-lg font-semibold", spec: "18 / 28 px, Semi Bold" },
  { name: "Body", className: "text-base", spec: "16 / 22 px, Regular" },
  { name: "Small", className: "text-sm", spec: "14 / 20 px, Regular" },
  { name: "Caption", className: "text-xs font-medium", spec: "12 / 16 px, Medium" },
  { name: "Code", className: "font-mono text-sm", spec: "JetBrains Mono 14 / 20 px" },
];

const BREAKPOINTS = [
  { device: "Phone", width: "320–767 px", layout: "One column. Files and chat open as full-height drawers from the menu and panel buttons in the header." },
  { device: "Tablet", width: "768–1023 px", layout: "Two columns of project cards. Editor full width, file list and chat as drawers." },
  { device: "Desktop", width: "1024 px and more", layout: "Three columns of cards. Project rail, file list, editor and chat side by side. Hover actions, keyboard shortcuts." },
];

function rgb(token: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return value.split(/\s+/).map(Number) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {note && <p className="mt-1 max-w-3xl text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ token }: { token: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="h-16 border-b border-line" style={{ backgroundColor: `rgb(var(--${token}))` }} />
      <div className="px-3 py-2">
        <p className="font-mono text-sm">--{token}</p>
        <p className="text-xs text-muted">rgb({rgb(token).join(" ")})</p>
      </div>
    </div>
  );
}

export function DesignSystemPage() {
  const { theme } = useTheme();
  const [, refresh] = useState(0);
  const [view, setView] = useState<"code" | "doc" | "board">("code");

  useEffect(() => {
    document.title = "Design system · Collab";
    refresh((n) => n + 1);
  }, [theme]);

  return (
    <div className="min-h-full bg-main">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-main/95 px-4 py-3 backdrop-blur sm:px-8">
        <Link to="/" className="flex min-h-11 items-center">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">Theme: {theme}</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-ink">Collab design system</p>
          <h1 className="text-4xl font-bold">Colors, type and components</h1>
          <p className="max-w-3xl text-lg text-muted">
            Every screen of the app is built from these parts, on phones, tablets and desktops. Colors are CSS
            variables with a dark and a light theme; sizes use rem, so the interface grows with browser zoom.
          </p>
        </div>

        <Section title="Surfaces" note="Background layers, from the darkest to the lightest control.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SURFACES.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Section>

        <Section
          title="Text colors and contrast"
          note="Contrast of each text color on the three main backgrounds, measured live for the current theme. WCAG 2.1 AA needs 4.5:1 for normal text."
        >
          <div className="overflow-x-auto rounded-xl bg-surface shadow-card">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Token</th>
                  {BACKGROUNDS.map((bg) => (
                    <th key={bg} className="px-4 py-3 font-medium">on --{bg}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TEXTS.map((token) => (
                  <tr key={token} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono" style={{ color: `rgb(var(--${token}))` }}>--{token}</td>
                    {BACKGROUNDS.map((bg) => {
                      const ratio = contrast(token, bg);
                      return (
                        <td key={bg} className="px-4 py-3" style={{ backgroundColor: `rgb(var(--${bg}))` }}>
                          <span style={{ color: `rgb(var(--${token}))` }}>Aa {ratio.toFixed(2)}:1</span>{" "}
                          <span className={ratio >= 4.5 ? "text-fg" : "text-bad"}>{ratio >= 4.5 ? "AA" : "fail"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Typography" note="Inter for the interface, JetBrains Mono for code. The same scale on every device.">
          <div className="divide-y divide-line rounded-xl bg-surface shadow-card">
            {TYPE_SCALE.map((item) => (
              <div key={item.name} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                <span className={item.className}>{item.name}: shared code, live</span>
                <span className="text-sm text-muted">{item.spec}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Buttons"
          note="Four variants and three sizes. On touch screens every button, link and field is at least 44 × 44 px; with a mouse the compact sizes stay."
        >
          <div className="space-y-4 rounded-xl bg-surface p-5 shadow-card">
            {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm text-muted">{variant}</span>
                <Button variant={variant} size="sm">Small</Button>
                <Button variant={variant}>Medium</Button>
                <Button variant={variant} size="lg">
                  <Plus size={18} />
                  Large
                </Button>
                <Button variant={variant} disabled>Disabled</Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-24 text-sm text-muted">icon</span>
              <IconButton label="Run"><Play size={18} /></IconButton>
              <IconButton label="Terminal" active><Terminal size={18} /></IconButton>
              <IconButton label="Rename"><Pencil size={18} /></IconButton>
              <IconButton label="Delete"><Trash2 size={18} /></IconButton>
              <IconButton label="Send"><Send size={18} /></IconButton>
            </div>
          </div>
        </Section>

        <Section title="Form fields" note="Label above, hint or error below. Errors are red, linked to the field for screen readers.">
          <div className="grid gap-5 rounded-xl bg-surface p-5 shadow-card md:grid-cols-3">
            <Field label="Name" placeholder="For example, Vlad" />
            <Field label="Password" type="password" defaultValue="secret" hint="At least 8 characters" />
            <Field label="Email" defaultValue="anna@" error="Enter a valid email address, like name@example.com" />
            <div className="md:col-span-3">
              <ErrorNote>This email is already registered</ErrorNote>
            </div>
          </div>
        </Section>

        <Section title="Badges, avatars and states">
          <div className="flex flex-wrap items-center gap-6 rounded-xl bg-surface p-5 shadow-card">
            <div className="flex gap-2">
              <RoleBadge role="owner" />
              <RoleBadge role="editor" />
              <RoleBadge role="viewer" />
            </div>
            <div className="flex items-center gap-2">
              <Avatar id="3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c10" name="Anna" size="lg" online />
              <Avatar id="8a1d4e2f-6c3b-4f9e-a7d5-2b8c9e0f1a34" name="Boris" size="md" />
              <Avatar id="1c7e9a3d-6f2b-4a8e-b5c1-9d4f0a2e7b63" name="Clara" size="sm" />
            </div>
            <span className="flex items-center gap-2 text-muted"><Spinner /> Loading…</span>
            <LogoMark size={40} />
          </div>
        </Section>

        <Section title="Segmented control" note="Used to choose the type of a new file.">
          <div className="max-w-md rounded-xl bg-surface p-5 shadow-card">
            <Segmented
              label="File type"
              value={view}
              onChange={setView}
              options={[
                { value: "code", label: "Code", icon: <Code2 size={18} /> },
                { value: "doc", label: "Document", icon: <FileText size={18} /> },
                { value: "board", label: "Board", icon: <LayoutDashboard size={18} /> },
              ]}
            />
          </div>
        </Section>

        <Section title="File list row" note="The row and its actions sit side by side, so they never overlap. With a mouse the actions show on hover; on touch screens they are always visible.">
          <ul className="max-w-sm space-y-0.5 rounded-xl bg-surface p-2 shadow-card">
            <li className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-muted"><Folder size={18} className="text-warn/80" /> src</li>
            <li className="flex items-center rounded-lg bg-selected">
              <span className="flex flex-1 items-center gap-2 px-3 py-1.5 font-medium text-fg"><Code2 size={18} className="text-ok" /> main.py</span>
              <span className="flex pr-1.5 text-faint"><Pencil size={16} className="m-1" /><Trash2 size={16} className="m-1" /></span>
            </li>
            <li className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium text-muted"><FileText size={18} className="text-ok" /> README.md</li>
          </ul>
        </Section>

        <Section title="Breakpoints" note="Mobile first: the base styles are for phones, wider screens add columns.">
          <div className="overflow-x-auto rounded-xl bg-surface shadow-card">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Width</th>
                  <th className="px-4 py-3 font-medium">Layout</th>
                </tr>
              </thead>
              <tbody>
                {BREAKPOINTS.map((row) => (
                  <tr key={row.device} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">{row.device}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.width}</td>
                    <td className="px-4 py-3 text-muted">{row.layout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </main>
    </div>
  );
}
