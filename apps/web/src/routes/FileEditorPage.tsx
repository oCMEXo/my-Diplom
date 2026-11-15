import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { Eye, History, MessageSquarePlus, Play, Square } from "lucide-react";
import { describeLanguage, inferLanguage, toRunnableLanguage } from "@collab/shared";
import { BoardEditor } from "../components/BoardEditor";
import { CollabEditor, type EditorController } from "../components/CollabEditor";
import { FileTabs } from "../components/FileTabs";
import { MarkdownPreview } from "../components/MarkdownPreview";
import { RunPanel } from "../components/RunPanel";
import { VersionHistoryDialog } from "../components/VersionHistoryDialog";
import { LanguagesDialog } from "../components/Languages";
import { useRunAccess } from "../components/RunAccess";
import { FILE_KINDS } from "../components/layout/ProjectNav";
import { ProjectHeader, type SyncStatus } from "../components/layout/ProjectHeader";
import { Button } from "../components/ui/Button";
import { api, ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { rememberFile } from "../lib/last-file";
import { useAnnounceFile, useFollowing, useRun } from "../lib/RealtimeContext";
import type { ProjectOutletContext } from "./ProjectPage";

const DEFAULT_TITLE = "Collab: work on a project together";

export function FileEditorPage() {
  const { projectId, fileId } = useParams<{ projectId: string; fileId: string }>();
  const { files, canEdit, shell, project } = useOutletContext<ProjectOutletContext>();
  const file = files.find((f) => f.id === fileId);
  const controller = useRef<EditorController | null>(null);
  const [activeController, setActiveController] = useState<EditorController | null>(null);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const run = useRun(fileId ?? "");
  const access = useRunAccess();
  const runRef = useRef(run);
  runRef.current = run;
  const [runError, setRunError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const revealLine = Number(searchParams.get("line")) || null;
  const revealColumn = Number(searchParams.get("col")) || undefined;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const { following, follow } = useFollowing();
  useAnnounceFile(file?.id);

  useEffect(() => {
    controller.current = null;
    setActiveController(null);
    setRunError(null);
    setStatus("connecting");
    setHistoryOpen(false);
  }, [fileId]);

  // A search result links here with ?line=…; the location key changes even when the same result is clicked twice.
  useEffect(() => {
    if (!activeController || !revealLine) return;
    return activeController.revealLine(revealLine, revealColumn);
  }, [activeController, revealLine, revealColumn, location.key]);

  useEffect(() => {
    if (projectId && fileId) rememberFile(projectId, fileId);
  }, [projectId, fileId]);

  const filePath = file?.path;
  useEffect(() => {
    if (!filePath) return;
    document.title = `${filePath} · ${project.name} — Collab`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [filePath, project.name]);

  useEffect(() => {
    if (run?.status === "running") controller.current?.setErrorLine(null);
    else if (run?.status === "error") controller.current?.setErrorLine(run.errorLine);
  }, [run?.runId, run?.status, run?.errorLine]);

  if (!file || !projectId) {
    return (
      <>
        <ProjectHeader shell={shell} title="File not found" />
        <div className="space-y-3 p-8 text-base text-muted">
          <p>The file may have been deleted, or you have no access to it.</p>
          {projectId && (
            <Link to={`/projects/${projectId}`} className="font-medium text-accent-ink hover:underline">
              Open another file of the project
            </Link>
          )}
        </div>
      </>
    );
  }

  const kind = FILE_KINDS[file.type];
  const languageInfo = file.type === "code" ? describeLanguage(file.path, file.language ?? inferLanguage(file.path)) : null;
  // Says which language the editor took the file for, and opens the list of all of them.
  const languageChip = languageInfo && (
    <>
      <button
        onClick={() => setLanguagesOpen(true)}
        aria-label={
          languageInfo.support === "run"
            ? `${languageInfo.name}: highlighting and running`
            : languageInfo.support === "highlight"
              ? `${languageInfo.name}: highlighting, no running`
              : "Unknown language: plain text"
        }
        title="Supported languages"
        className={cn(
          "hidden shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium transition hover:bg-raised bar-md:inline-flex",
          languageInfo.support === "text" ? "text-warn" : "text-faint hover:text-fg",
        )}
      >
        {languageInfo.support === "text" ? "Text" : languageInfo.name}
      </button>
      {languagesOpen && <LanguagesDialog onClose={() => setLanguagesOpen(false)} />}
    </>
  );
  const name = file.path.split("/").pop() ?? file.path;
  const header = {
    shell,
    status,
    title: file.path,
    icon: <kind.icon size={20} className={cn("shrink-0", kind.tone)} />,
    badge: (
      <>
        {!canEdit && (
          <span className="inline-flex items-center gap-1 rounded-md bg-raised px-1.5 py-0.5 text-xs font-medium text-muted">
            <Eye size={12} />
            read only
          </span>
        )}
        {languageChip}
      </>
    ),
  };

  if (file.type === "board") {
    return (
      <>
        <ProjectHeader {...header} />
        <FileTabs projectId={projectId} files={files} activeId={file.id} />
        <div className="min-h-0 flex-1">
          <BoardEditor key={file.id} fileId={file.id} readOnly={!canEdit} fileName={name} onStatusChange={setStatus} />
        </div>
      </>
    );
  }

  const isDoc = file.type === "doc";
  const language = isDoc ? "markdown" : (file.language ?? inferLanguage(file.path));
  const runnable = !!access.mode && access.mode !== "off" && !isDoc && toRunnableLanguage(language) !== null;
  const running = run?.status === "running";

  async function startRun() {
    if (!controller.current) return;
    setRunError(null);
    try {
      await api.post(`/projects/${projectId}/files/${file!.id}/run`, {
        code: controller.current.getCode(),
      });
    } catch (err) {
      if (access.refused(err, () => void startRun())) return;
      setRunError(err instanceof ApiError ? err.message : "Could not run");
    }
  }

  async function stopRun() {
    if (!run) return;
    setRunError(null);
    try {
      await api.post(`/projects/${projectId}/runs/${run.runId}/stop`);
    } catch (err) {
      if (access.refused(err, () => void stopRun())) return;
      setRunError(err instanceof ApiError ? err.message : "Could not stop");
    }
  }

  const shareLine = (line: number) => shell.shareInChat(`${file.path}:${line}`);

  const editor = (
    <CollabEditor
      fileId={file.id}
      language={language}
      readOnly={!canEdit}
      autoFocus={(location.state as { focusEditor?: boolean } | null)?.focusEditor}
      following={following}
      onTyped={() => follow(null)}
      onShareLine={shareLine}
      onStatusChange={setStatus}
      onReady={(c) => {
        controller.current = c;
        setActiveController(c);
        if (runRef.current?.status === "error") c.setErrorLine(runRef.current.errorLine);
      }}
    />
  );

  const actions = (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => shareLine(activeController?.getCursorLine() ?? 1)}
        title="Mention this line in the chat (Alt+L)"
        aria-label="Mention this line in the chat"
        // On the narrowest phones the header has no room; Alt+L and the editor's menu still do it.
        className="hidden bar-md:inline-flex"
      >
        <MessageSquarePlus size={16} />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)} title="Version history" aria-label="Version history">
        <History size={16} />
      </Button>
      {runnable && canEdit && (
        <>
          {runError && (
            <span role="alert" title={runError} className="max-w-40 truncate text-sm text-bad bar-lg:max-w-xs">
              {runError}
            </span>
          )}
          {access.dialog}
          {/* While the program runs, the same place stops it: an endless loop need not wait for the time limit. */}
          {running ? (
            <Button size="sm" onClick={() => access.ensure(() => void stopRun())} aria-label="Stop" title="Stop the program">
              <Square size={14} className="fill-current text-bad" />
              <span className="hidden bar-md:inline">Stop</span>
            </Button>
          ) : (
            <Button size="sm" onClick={() => access.ensure(() => void startRun())} aria-label="Run" title="Run the file">
              <Play size={16} className="fill-current text-ok" />
              <span className="hidden bar-md:inline">Run</span>
            </Button>
          )}
        </>
      )}
      {historyOpen && (
        <VersionHistoryDialog
          projectId={projectId}
          file={file}
          language={language ?? "plaintext"}
          controller={activeController}
          canEdit={canEdit}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </span>
  );

  if (isDoc) {
    return (
      <>
        <ProjectHeader {...header} actions={actions} />
        <FileTabs projectId={projectId} files={files} activeId={file.id} />
        <div className="grid min-h-0 flex-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
          <div className="min-h-0 min-w-0 border-b border-line md:border-b-0 md:border-r">{editor}</div>
          <div className="min-h-0 min-w-0">
            <MarkdownPreview controller={activeController} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ProjectHeader {...header} actions={actions} />
      <FileTabs projectId={projectId} files={files} activeId={file.id} />
      <div className="min-h-0 flex-1">{editor}</div>
      {runnable && <RunPanel run={run} />}
    </>
  );
}
