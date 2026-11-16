import { useEffect, useRef, useState } from "react";
import { ChevronUp, Copy, Check, Maximize2, Minimize2, SquareTerminal, Info } from "lucide-react";
import type { RunState } from "../lib/RealtimeContext";
import { missingModule, wantsInput } from "../lib/run-hints";
import { cn } from "../lib/cn";
import { IconButton } from "./ui/Button";

const STATUS: Record<RunState["status"], { label: string; dot: string }> = {
  running: { label: "running…", dot: "bg-warn animate-pulse" },
  ok: { label: "finished", dot: "bg-ok" },
  error: { label: "error", dot: "bg-bad" },
  timeout: { label: "time limit (10 s)", dot: "bg-bad" },
  failed: { label: "could not start", dot: "bg-bad" },
  stopped: { label: "stopped", dot: "bg-faint" },
};

export function RunPanel({ run }: { run: RunState | undefined }) {
  const [open, setOpen] = useState(false);
  const [tall, setTall] = useState(false);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (run?.status === "running") setOpen(true);
  }, [run?.runId, run?.status]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (run?.status === "running" || run?.status === "ok") el.scrollTop = el.scrollHeight;
    else if (run) el.scrollTop = 0;
  }, [run?.output.length, run?.status, open]);

  const text = run?.output.map((part) => part.chunk).join("") ?? "";
  const failed = !!run && run.status !== "running" && run.status !== "ok";
  const missing = failed ? missingModule(text) : null;
  const needsKeyboard = failed && wantsInput(text);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }

  return (
    <div className="shrink-0 border-t border-line bg-surface">
      <div className="flex h-10 items-center gap-1 pr-2">
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex h-full min-w-0 flex-1 items-center justify-between gap-3 px-4 text-left text-sm text-muted transition hover:bg-raised/60"
        >
          <span className="flex items-center gap-2 font-semibold uppercase tracking-wider text-faint">
            <SquareTerminal size={16} />
            Output
            <ChevronUp size={16} className={cn("transition-transform", !open && "rotate-180")} />
          </span>
          {run && (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS[run.status].dot)} />
              <span role="status">
                {run.startedBy.name} · {STATUS[run.status].label}
              </span>
              {run.durationMs !== null && ` · ${(run.durationMs / 1000).toFixed(1)} s`}
            </span>
          )}
        </button>
        {open && text && (
          <IconButton label={copied ? "Copied" : "Copy output"} onClick={copy} className="h-8 w-8">
            {copied ? <Check size={16} className="text-ok" /> : <Copy size={16} />}
          </IconButton>
        )}
        {open && (
          <IconButton
            label={tall ? "Make the panel smaller" : "Make the panel bigger"}
            onClick={() => setTall((value) => !value)}
            className="h-8 w-8"
          >
            {tall ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        )}
      </div>

      {open && (
        <>
          {needsKeyboard && (
            <p className="flex items-start gap-2 border-t border-line bg-warn/10 px-4 py-2 text-sm text-warn">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                The program waits for keyboard input, but the Run button has no place to type it. Run it in the terminal: it
                opens with Ctrl+`.
              </span>
            </p>
          )}
          {missing && (
            <p className="flex items-start gap-2 border-t border-line bg-warn/10 px-4 py-2 text-sm text-warn">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                Module “{missing}” was not found. The sandbox has no network and no installed packages. You can use the built-in modules
                of the language and the files of your project.
              </span>
            </p>
          )}
          <pre
            ref={bodyRef}
            className={cn(
              "overflow-auto whitespace-pre-wrap break-words border-t border-line bg-canvas px-4 py-3 font-mono text-sm leading-6 text-fg",
              tall ? "h-[55vh]" : "h-48",
            )}
          >
            {!run && <span className="text-faint">The result of a run appears here. Everyone in the project sees it.</span>}
            {run?.output.map((part, index) => (
              <span key={index} className={part.stream === "stderr" ? "text-bad" : undefined}>
                {part.chunk}
              </span>
            ))}
            {run?.status === "running" && run.output.length === 0 && <span className="text-faint">…</span>}
            {run?.truncated && <span className="text-warn">{"\n[output cut]"}</span>}
            {run && run.status !== "running" && run.exitCode !== null && run.exitCode !== 0 && (
              <span className="text-faint">{`\n[exit code ${run.exitCode}]`}</span>
            )}
          </pre>
        </>
      )}
    </div>
  );
}
