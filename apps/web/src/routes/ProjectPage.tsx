import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import type { AccessChangeReason, FileRecord, FileType, ProjectWithMembers } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { RealtimeProvider, useRealtimeEvents } from "../lib/RealtimeContext";
import { BranchDialog, refreshProjectFiles } from "../components/BranchDialog";
import type { ChatInsert } from "../components/ChatPanel";
import { FollowBar } from "../components/FollowBar";
import { TerminalPanel } from "../components/TerminalPanel";
import { useRunMode } from "../lib/features";
import { CreateFileDialog } from "../components/CreateFileDialog";
import { CreateProjectDialog } from "../components/CreateProjectDialog";
import { DeleteFileDialog } from "../components/DeleteFileDialog";
import { ImportGithubDialog } from "../components/ImportGithubDialog";
import { PushGithubDialog } from "../components/PushGithubDialog";
import { QuickOpen } from "../components/QuickOpen";
import { RenameFileDialog } from "../components/RenameFileDialog";
import { SearchPanel } from "../components/SearchPanel";
import { InviteDialog } from "../components/InviteDialog";
import { UnreadWatcher } from "../components/UnreadWatcher";
import { ProjectNav } from "../components/layout/ProjectNav";
import { SidePanel, type PanelTab } from "../components/layout/SidePanel";
import type { ShellActions } from "../components/layout/ProjectHeader";
import { ErrorScreen } from "../components/ui/ErrorScreen";
import { FullScreenLoader } from "../components/ui/Spinner";

export interface ProjectOutletContext {
  files: FileRecord[];
  canEdit: boolean;
  project: ProjectWithMembers;
  shell: ShellActions;
  createFile: (type: FileType) => void;
  importRepo: () => void;
}

const WIDE = "(min-width: 1280px)";
const NAV_WIDE = "(min-width: 1024px)";

/** When somebody opens another branch, everybody's file list follows. */
function BranchWatcher({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  useRealtimeEvents((event) => {
    if (event.type !== "project.branch") return;
    const onFile = location.pathname.includes("/files/");
    void refreshProjectFiles(queryClient, projectId).then(() => {
      if (onFile) navigate(`/projects/${projectId}`);
    });
  });
  return null;
}

/** A role changed or somebody left: refresh the member list and my own rights in the project. */
function MembersWatcher({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  useRealtimeEvents((event) => {
    if (event.type === "project.members") queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  });
  return null;
}

/** Somebody created, renamed or deleted a file: everybody's tree and trash stay current. */
function FilesWatcher({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  useRealtimeEvents((event) => {
    if (event.type !== "project.files") return;
    queryClient.invalidateQueries({ queryKey: ["files", projectId] });
    queryClient.invalidateQueries({ queryKey: ["trash", projectId] });
  });
  return null;
}

/** What the projects page says after the server took the open project away. */
function revokedNotice(reason: AccessChangeReason, projectName: string) {
  if (reason === "deleted") return `Проект «${projectName}» удалён владельцем.`;
  if (reason === "left") return `Вы покинули проект «${projectName}».`;
  return `Вас удалили из проекта «${projectName}».`;
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [navOpen, setNavOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia(WIDE).matches);
  const [panelTab, setPanelTab] = useState<PanelTab>("chat");
  const [unread, setUnread] = useState(0);
  const [chatInsert, setChatInsert] = useState<ChatInsert | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [creatingFile, setCreatingFile] = useState<FileType | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [deletingFile, setDeletingFile] = useState<FileRecord | null>(null);
  const [renamingFile, setRenamingFile] = useState<FileRecord | null>(null);
  const [searching, setSearching] = useState(false);
  const [finding, setFinding] = useState(false);
  const [findFocus, setFindFocus] = useState(0);
  const [branching, setBranching] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const runMode = useRunMode();
  const terminalAvailable = !!runMode && runMode !== "off";

  const openFind = useCallback(() => {
    setFinding(true);
    setFindFocus((value) => value + 1);
    // On narrower screens the chat is a drawer too and would cover the search.
    if (!window.matchMedia(WIDE).matches) setPanelOpen(false);
  }, []);

  const closePanelIfDrawer = useCallback(() => {
    if (!window.matchMedia(WIDE).matches) setPanelOpen(false);
  }, []);

  const clearChatInsert = useCallback(() => setChatInsert(null), []);

  const shareInChat = useCallback((text: string) => {
    setPanelOpen(true);
    setPanelTab("chat");
    setChatInsert((previous) => ({ text, key: (previous?.key ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Ctrl+P (or Ctrl+K) opens "go to file" instead of the browser's print dialog.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && ["p", "k"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setSearching(true);
      }
      // Ctrl+Shift+F searches inside the files, as in VS Code; the key code works in any keyboard layout.
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.code === "KeyF") {
        event.preventDefault();
        openFind();
      }
      // Ctrl+` opens and closes the terminal, as in VS Code.
      if (event.ctrlKey && event.code === "Backquote") {
        event.preventDefault();
        setTerminalOpen((open) => !open);
      }
      // Escape closes a drawer that covers the page; a dialog on top closes first.
      if (event.key === "Escape" && !document.querySelector('[role="dialog"]')) {
        setNavOpen(false);
        closePanelIfDrawer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openFind, closePanelIfDrawer]);

  // The mobile drawers should not stay open after moving to another page.
  useEffect(() => setNavOpen(false), [location.pathname]);

  const { data: project, error: projectError, refetch: refetchProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get<ProjectWithMembers>(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: files, error: filesError, refetch: refetchFiles } = useQuery({
    queryKey: ["files", projectId],
    queryFn: () => api.get<FileRecord[]>(`/projects/${projectId}/files`),
    enabled: !!projectId,
  });

  const createFile = useMutation({
    mutationFn: (input: { path: string; type: FileType }) =>
      api.post<FileRecord>(`/projects/${projectId}/files`, input),
    onSuccess: (file) => {
      queryClient.invalidateQueries({ queryKey: ["files", projectId] });
      navigate(`/projects/${projectId}/files/${file.id}`, { state: { focusEditor: true } });
    },
  });

  const loadError = projectError ?? filesError;
  if ((!project || !files) && loadError) {
    // 400 is what the server says about an address that is not a project id at all.
    const missing = loadError instanceof ApiError && [400, 403, 404].includes(loadError.status);
    return (
      <ErrorScreen
        title={missing ? "Проект недоступен" : "Не удалось открыть проект"}
        message={
          missing
            ? "Проекта нет или у вас нет к нему доступа: возможно, ссылка устарела или вас убрали из участников."
            : "Похоже, нет связи с сервером. Проверьте интернет и попробуйте ещё раз."
        }
        onRetry={
          missing
            ? undefined
            : () => {
                void refetchProject();
                void refetchFiles();
              }
        }
      />
    );
  }
  if (!project || !files) return <FullScreenLoader label="Открываем проект…" />;

  const canEdit = project.myRole === "owner" || project.myRole === "editor";
  // The server gives the link only to those who may hand it out; a viewer gets none.
  const openInvite = project.inviteCode ? () => setInviteOpen(true) : undefined;
  const shell: ShellActions = {
    openNav: () => setNavOpen(true),
    togglePanel: () => setPanelOpen((value) => !value),
    panelOpen,
    openInvite,
    shareInChat,
    unread,
  };

  return (
    <RealtimeProvider
      key={project.id}
      projectId={project.id}
      onRevoked={(reason) => {
        queryClient.removeQueries({ queryKey: ["project", project.id] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        navigate("/", { replace: true, state: { notice: revokedNotice(reason, project.name) } });
      }}
    >
      <BranchWatcher projectId={project.id} />
      <MembersWatcher projectId={project.id} />
      <FilesWatcher projectId={project.id} />
      <UnreadWatcher projectId={project.id} chatShown={panelOpen && panelTab === "chat"} setUnread={setUnread} />
      <div className="flex h-dvh overflow-hidden">
        {navOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden" onClick={() => setNavOpen(false)} />
        )}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 shrink-0 transition-transform duration-200 lg:visible lg:static lg:translate-x-0",
            // Off-screen is not enough: its buttons would still catch the keyboard focus.
            navOpen ? "translate-x-0" : "invisible -translate-x-full",
          )}
        >
          <ProjectNav
            project={project}
            files={files}
            canEdit={canEdit}
            onCreateFile={setCreatingFile}
            onCreateProject={() => setCreatingProject(true)}
            onInvite={openInvite}
            onImport={() => setImporting(true)}
            onPush={() => setPushing(true)}
            onDeleteFile={setDeletingFile}
            onRenameFile={setRenamingFile}
            onSearch={() => setSearching(true)}
            onFindInFiles={() => {
              setNavOpen(false);
              openFind();
            }}
            onNavigate={() => setNavOpen(false)}
            onBranches={() => setBranching(true)}
            terminalOpen={terminalOpen}
            onToggleTerminal={terminalAvailable ? () => setTerminalOpen((open) => !open) : undefined}
          />
        </div>

        {finding && (
          <>
            <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden" onClick={() => setFinding(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 w-80 max-w-[90vw] shrink-0 border-r border-line animate-slide-in lg:static lg:z-auto">
              <SearchPanel
                projectId={project.id}
                files={files}
                focusSignal={findFocus}
                onClose={() => setFinding(false)}
                onOpen={(fileId, match) => {
                  // On a phone the panel covers the editor, so it steps aside once a result is chosen.
                  if (!window.matchMedia(NAV_WIDE).matches) setFinding(false);
                  navigate(`/projects/${project.id}/files/${fileId}?line=${match.line}&col=${match.column}`);
                }}
              />
            </aside>
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <FollowBar projectId={project.id} />
          <Outlet
            context={
              {
                files,
                canEdit,
                project,
                shell,
                createFile: setCreatingFile,
                importRepo: () => setImporting(true),
              } satisfies ProjectOutletContext
            }
          />
          {terminalOpen && terminalAvailable && canEdit && (
            <TerminalPanel projectId={project.id} onClose={() => setTerminalOpen(false)} />
          )}
        </main>

        {panelOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-fade-in xl:hidden" onClick={shell.togglePanel} />
            <aside className="fixed inset-y-0 right-0 z-40 w-80 max-w-[90vw] border-l border-line animate-slide-in xl:static xl:z-auto">
              <SidePanel
                project={project}
                files={files}
                tab={panelTab}
                unread={unread}
                chatInsert={chatInsert}
                onTabChange={setPanelTab}
                onChatInsertDone={clearChatInsert}
                onFileLink={closePanelIfDrawer}
                onInvite={openInvite}
                onClose={shell.togglePanel}
              />
            </aside>
          </>
        )}
      </div>

      {inviteOpen && <InviteDialog project={project} onClose={() => setInviteOpen(false)} />}
      {importing && <ImportGithubDialog project={project} onClose={() => setImporting(false)} />}
      {pushing && <PushGithubDialog project={project} onClose={() => setPushing(false)} />}
      {branching && <BranchDialog project={project} canEdit={canEdit} onClose={() => setBranching(false)} />}
      {searching && (
        <QuickOpen
          files={files}
          onClose={() => setSearching(false)}
          onOpen={(file) => {
            setSearching(false);
            navigate(`/projects/${project.id}/files/${file.id}`);
          }}
        />
      )}
      {renamingFile && (
        <RenameFileDialog projectId={project.id} file={renamingFile} files={files} onClose={() => setRenamingFile(null)} />
      )}
      {deletingFile && (
        <DeleteFileDialog
          projectId={project.id}
          file={deletingFile}
          onClose={() => setDeletingFile(null)}
          onDeleted={() => {
            const wasOpen = location.pathname.endsWith(`/files/${deletingFile.id}`);
            setDeletingFile(null);
            if (wasOpen) navigate(`/projects/${project.id}`);
          }}
        />
      )}
      {creatingFile && (
        <CreateFileDialog
          initialType={creatingFile}
          files={files}
          onClose={() => setCreatingFile(null)}
          onCreate={async (path, type) => {
            await createFile.mutateAsync({ path, type });
          }}
        />
      )}
      {creatingProject && (
        <CreateProjectDialog
          onClose={() => setCreatingProject(false)}
          onCreated={(created) => {
            setCreatingProject(false);
            navigate(`/projects/${created.id}`);
          }}
        />
      )}
    </RealtimeProvider>
  );
}
