import { useEffect, useRef, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { MONACO_THEME } from "../lib/monaco-setup";
import { installRemoteCursorStyles } from "../lib/cursor-styles";
import { useCollabDoc, type CollabStatus } from "../lib/useCollabDoc";
import { useTheme } from "../lib/theme";
import type { HocuspocusProvider } from "@hocuspocus/provider";

export interface EditorController {
  getCode: () => string;
  /** Calls the handler with the full text now and after every change (local or remote). */
  subscribe: (handler: (text: string) => void) => () => void;
  setErrorLine: (line: number | null) => void;
  /** Puts the cursor at the line (and column) and scrolls it into view; returns a function that cancels a pending move. */
  revealLine: (line: number, column?: number) => () => void;
  getCursorLine: () => number;
}

type CodeEditor = Parameters<OnMount>[0];

/** What y-monaco and useCollabDoc publish about each participant. */
interface PeerState {
  user?: { id?: unknown };
  selection?: { head?: Y.RelativePosition | null } | null;
}

/** Below this height (px) the editor is still being laid out, so scrolling it would not stick. */
const MIN_REVEAL_HEIGHT = 100;

function languageFor(language: string | null): string {
  return language ?? "plaintext";
}

export function CollabEditor({
  fileId,
  language,
  readOnly,
  autoFocus,
  following,
  onStatusChange,
  onReady,
  onTyped,
  onShareLine,
}: {
  fileId: string;
  language: string | null;
  readOnly: boolean;
  autoFocus?: boolean;
  /** The participant whose cursor to keep in view. */
  following?: string | null;
  onStatusChange?: (status: CollabStatus) => void;
  onReady?: (controller: EditorController) => void;
  /** This person pressed a key in the editor. */
  onTyped?: () => void;
  onShareLine?: (line: number) => void;
}) {
  const { provider, status } = useCollabDoc(fileId);
  const { theme } = useTheme();
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  providerRef.current = provider;
  const monacoRef = useRef<Monaco | null>(null);
  const [editor, setEditor] = useState<CodeEditor | null>(null);
  const onTypedRef = useRef(onTyped);
  onTypedRef.current = onTyped;
  const onShareLineRef = useRef(onShareLine);
  onShareLineRef.current = onShareLine;

  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);

  useEffect(() => {
    const awareness = provider?.awareness;
    const stop = awareness ? installRemoteCursorStyles(awareness) : undefined;
    return () => {
      stop?.();
      bindingRef.current?.destroy();
      bindingRef.current = null;
      setEditor(null);
    };
  }, [provider]);

  // While following somebody, their cursor stays on the screen.
  useEffect(() => {
    const awareness = provider?.awareness;
    const model = editor?.getModel();
    if (!following || !provider || !awareness || !editor || !model) return;
    const reveal = () => {
      awareness.getStates().forEach((value) => {
        const state = value as PeerState;
        if (state.user?.id !== following || !state.selection?.head) return;
        const head = Y.createAbsolutePositionFromRelativePosition(state.selection.head, provider.document);
        if (head && !model.isDisposed()) editor.revealPositionInCenterIfOutsideViewport(model.getPositionAt(head.index));
      });
    };
    awareness.on("change", reveal);
    reveal();
    return () => awareness.off("change", reveal);
  }, [following, provider, editor]);

  const handleMount: OnMount = (mounted, monaco) => {
    monacoRef.current = monaco;
    const current = providerRef.current;
    const model = mounted.getModel();
    if (!current || !model) return;

    const yText = current.document.getText("monaco");
    bindingRef.current = new MonacoBinding(yText, model, new Set([mounted]), current.awareness ?? undefined);
    setEditor(mounted);
    if (autoFocus) mounted.focus();
    mounted.onKeyDown(() => onTypedRef.current?.());
    mounted.addAction({
      id: "collab.share-line",
      label: "Сослаться на эту строку в чате",
      contextMenuGroupId: "9_cutcopypaste",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyL],
      run: () => onShareLineRef.current?.(mounted.getPosition()?.lineNumber ?? 1),
    });

    const errorMarks = mounted.createDecorationsCollection();
    onReady?.({
      getCode: () => yText.toString(),
      getCursorLine: () => mounted.getPosition()?.lineNumber ?? 1,
      subscribe: (handler) => {
        const listener = () => handler(yText.toString());
        yText.observe(listener);
        listener();
        return () => yText.unobserve(listener);
      },
      setErrorLine: (line) =>
        errorMarks.set(
          line
            ? [
                {
                  range: new monaco.Range(line, 1, line, 1),
                  options: { isWholeLine: true, className: "run-error-line" },
                },
              ]
            : [],
        ),
      revealLine: (line, column = 1) => {
        const move = () => {
          if (model.isDisposed()) return true; // the page already moved on to another file
          if (model.getLineCount() < line) return false;
          const position = { lineNumber: line, column };
          const reveal = () => mounted.revealPositionInCenter(position, monaco.editor.ScrollType.Immediate);
          mounted.setPosition(position);
          mounted.focus();
          // Just after mounting the editor has no size yet and a scroll made then is lost: wait for the layout.
          if (mounted.getLayoutInfo().height >= MIN_REVEAL_HEIGHT) {
            reveal();
          } else {
            const sized = mounted.onDidLayoutChange((layout) => {
              if (layout.height < MIN_REVEAL_HEIGHT) return;
              sized.dispose();
              reveal();
            });
          }
          return true;
        };
        if (move()) return () => {};
        // The text may still be arriving from the server: wait until the line exists.
        let waiting = true;
        const stop = () => {
          if (waiting) yText.unobserve(listener); // Yjs complains about removing a handler twice
          waiting = false;
        };
        const listener = () => {
          if (move()) stop();
        };
        yText.observe(listener);
        return stop;
      },
    });
  };

  if (!provider) return null;

  return (
    <Editor
      key={fileId}
      language={languageFor(language)}
      onMount={handleMount}
      theme={MONACO_THEME[theme]}
      loading={<span className="text-sm text-muted">Загружаем редактор…</span>}
      options={{
        readOnly,
        readOnlyMessage: { value: "Только чтение: менять файлы могут редакторы и владелец проекта." },
        ariaLabel: "Редактор файла",
        minimap: { enabled: false },
        fontSize: 13.5,
        fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
        fontLigatures: true,
        lineHeight: 22,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        renderLineHighlight: "gutter",
        roundedSelection: true,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        automaticLayout: true,
        wordWrap: language === "markdown" ? "on" : "off",
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
