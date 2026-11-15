import { useEffect, useRef, useState, type ButtonHTMLAttributes, type PointerEvent as ReactPointerEvent } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { OctagonX, RotateCcw, SquareTerminal, X } from "lucide-react";
import {
  TERMINAL_MAX_MINUTES,
  TERMINAL_WORKDIR,
  terminalServerMessageSchema,
  type TerminalClientMessage,
  type TerminalTicket,
} from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { wsUrl } from "../lib/endpoints";
import { useRunMode } from "../lib/features";
import { currentRunCode, runCode } from "../lib/run-code";
import { Button } from "./ui/Button";
import { RunCodeForm } from "./RunAccess";
import { Spinner } from "./ui/Spinner";

const TERMINAL_URL = import.meta.env.VITE_TERMINAL_URL ?? "http://localhost:3003";
const HEIGHT_KEY = "collab.terminalHeight";

type Phase =
  | { name: "locked" }
  | { name: "connecting"; message: string }
  | { name: "ready" }
  | { name: "ended"; message: string };

function savedHeight() {
  try {
    return Number(localStorage.getItem(HEIGHT_KEY)) || 300;
  } catch {
    return 300;
  }
}

// Git Bash-like colours on a dark background, whatever the app's theme.
const THEME = {
  background: "#1e1f22",
  foreground: "#dbdee1",
  cursor: "#dbdee1",
  selectionBackground: "#5865f266",
  black: "#2b2d31",
  green: "#34d399",
  yellow: "#fbbf24",
  magenta: "#c084fc",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  red: "#f87171",
  white: "#dbdee1",
};

function HeaderButton({ label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#b5bac1] transition hover:bg-white/10 hover:text-[#dbdee1]"
      {...rest}
    />
  );
}

/**
 * A live command line in a sandbox with the project's files, like Git Bash: `ls`, `node main.js`,
 * `python app.py`. One session per open panel; closing the panel ends it.
 */
export function TerminalPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const mode = useRunMode();
  const host = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState(0);
  const [phase, setPhase] = useState<Phase>({ name: "connecting", message: "Starting the terminal…" });
  const [height, setHeight] = useState(savedHeight);
  /** Sends keys to the shell from outside the terminal, for the Ctrl+C button. */
  const sendKeys = useRef<((data: string) => void) | null>(null);
  const termRef = useRef<Terminal | null>(null);

  const locked = mode === "code" && !currentRunCode();

  useEffect(() => {
    if (!host.current || !mode || mode === "off") return;
    if (locked) {
      setPhase({ name: "locked" });
      return;
    }

    const term = new Terminal({
      theme: THEME,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 15,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    fit.fit();

    let socket: WebSocket | null = null;
    let disposed = false;
    const send = (message: TerminalClientMessage) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    sendKeys.current = (data) => send({ type: "input", data });
    termRef.current = term;

    setPhase({ name: "connecting", message: "Starting the terminal…" });
    (async () => {
      let ticket: string;
      try {
        ({ ticket } = await api.post<TerminalTicket>(`/projects/${projectId}/terminal`));
      } catch (error) {
        if (disposed) return;
        if (mode === "code" && error instanceof ApiError && error.status === 403 && /access code/i.test(error.message)) {
          runCode.clear();
          setPhase({ name: "locked" });
          return;
        }
        setPhase({ name: "ended", message: error instanceof ApiError ? error.message : "Could not open the terminal" });
        return;
      }
      if (disposed) return;
      const url = new URL(wsUrl(TERMINAL_URL, window.location.origin));
      url.search = new URLSearchParams({ ticket, cols: String(term.cols), rows: String(term.rows) }).toString();
      socket = new WebSocket(url);
      let ended = false;
      socket.onmessage = (event) => {
        const parsed = terminalServerMessageSchema.safeParse(JSON.parse(String(event.data)));
        if (!parsed.success) return;
        const message = parsed.data;
        if (message.type === "output") term.write(message.data);
        else if (message.type === "status") setPhase({ name: "connecting", message: message.message });
        else if (message.type === "ready") {
          setPhase({ name: "ready" });
          term.focus();
        } else {
          ended = true;
          setPhase({ name: "ended", message: message.message });
        }
      };
      socket.onclose = () => {
        if (!disposed && !ended) setPhase({ name: "ended", message: "The connection to the terminal was lost." });
      };
    })();

    const input = term.onData((data) => send({ type: "input", data }));
    const resize = term.onResize(({ cols, rows }) => send({ type: "resize", cols, rows }));
    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // Hidden for a moment: nothing to measure.
      }
    });
    observer.observe(host.current);

    return () => {
      disposed = true;
      sendKeys.current = null;
      termRef.current = null;
      observer.disconnect();
      input.dispose();
      resize.dispose();
      socket?.close();
      term.dispose();
    };
  }, [projectId, session, mode, locked]);

  function startResize(event: ReactPointerEvent) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    let latest = startHeight;
    const move = (moveEvent: PointerEvent) => {
      latest = Math.min(window.innerHeight - 160, Math.max(140, startHeight + startY - moveEvent.clientY));
      setHeight(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      try {
        localStorage.setItem(HEIGHT_KEY, String(latest));
      } catch {
        // Not remembered: fine.
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <section aria-label="Terminal" className="relative flex shrink-0 flex-col border-t border-line bg-[#1e1f22]" style={{ height }}>
      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize"
        title="Drag to change the height"
      />
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-sm text-[#b5bac1]">
        <SquareTerminal size={16} className="text-[#34d399]" />
        <span className="font-medium text-[#dbdee1]">Terminal</span>
        <span className="hidden truncate sm:inline">
          sandbox · {TERMINAL_WORKDIR} · no internet · up to {TERMINAL_MAX_MINUTES} minutes · edits here do not go into the project
        </span>
        <span className="flex-1" />
        {phase.name === "ready" && (
          // Ctrl+C for those without a Ctrl key, such as on a phone, and for those who do not know it.
          <button
            type="button"
            onClick={() => {
              sendKeys.current?.("\u0003");
              termRef.current?.focus();
            }}
            aria-label="Stop the program (Ctrl+C)"
            title="Stop the program (Ctrl+C)"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[#b5bac1] transition hover:bg-white/10 hover:text-[#dbdee1]"
          >
            <OctagonX size={16} className="text-[#fc878b]" />
            <span className="font-mono text-xs">Ctrl+C</span>
          </button>
        )}
        <HeaderButton label="New session with the current files" onClick={() => setSession((value) => value + 1)}>
          <RotateCcw size={16} />
        </HeaderButton>
        <HeaderButton label="Close the terminal" onClick={onClose}>
          <X size={18} />
        </HeaderButton>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0 px-2 py-1" />
        {phase.name !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1f22]/85 p-4">
            {phase.name === "connecting" && (
              <p className="flex items-center gap-3 text-base text-[#b5bac1]">
                <Spinner /> {phase.message}
              </p>
            )}
            {phase.name === "ended" && (
              <div className="space-y-3 text-center">
                <p className="text-base text-[#dbdee1]">{phase.message}</p>
                <Button size="sm" variant="primary" onClick={() => setSession((value) => value + 1)}>
                  <RotateCcw size={16} />
                  Open again
                </Button>
              </div>
            )}
            {phase.name === "locked" && (
              <div className="w-full max-w-sm rounded-lg bg-surface p-5 text-fg shadow-pop">
                <p className="mb-3 text-base text-muted">On this site the terminal opens only with the owner's access code.</p>
                <RunCodeForm onUnlocked={() => setSession((value) => value + 1)} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
