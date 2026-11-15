import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, GitBranch, GitCommitHorizontal, LoaderCircle, TriangleAlert } from "lucide-react";
import type { GithubBranchesResult, ProjectWithMembers, PushPreview, PushResult } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";

const TOKEN_KEY = "collab.github-token";
/** Collab saves edits to the DB within 3 s; wait a bit longer before reading them. */
const SYNC_WAIT_MS = 3500;
const LOOKUP_DELAY_MS = 600;

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage may be blocked; the token then simply is not remembered
  }
}

function suggestBranchName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `collab-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

type Preview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: PushPreview }
  | { state: "error"; message: string };

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: GithubBranchesResult }
  | { state: "error"; message: string };

export function PushGithubDialog({ project, onClose }: { project: ProjectWithMembers; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(readToken);
  const [remember, setRemember] = useState(() => readToken() !== "");
  const [message, setMessage] = useState("Update from Collab");
  const [repoUrl, setRepoUrl] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [target, setTarget] = useState<"existing" | "new">("existing");
  const [existingBranch, setExistingBranch] = useState("");
  const [newBranch, setNewBranch] = useState(suggestBranchName);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [phase, setPhase] = useState<"idle" | "saving" | "pushing">("idle");
  const [preview, setPreview] = useState<Preview>({ state: "idle" });
  const lookupId = useRef(0);
  const previewId = useRef(0);

  const linked = project.github;
  const tokenReady = token.trim().length >= 10;
  const repoReady = !!linked || repoUrl.trim().length > 3;

  // Load the branches once token and repo are filled in. The token only goes in the request body,
  // never into the persisted query cache.
  useEffect(() => {
    if (!tokenReady || !repoReady) {
      setLookup({ state: "idle" });
      return;
    }
    const id = ++lookupId.current;
    setLookup({ state: "loading" });
    const timer = setTimeout(() => {
      api
        .post<GithubBranchesResult>(`/projects/${project.id}/github/branches`, {
          token: token.trim(),
          ...(linked ? {} : { repoUrl: repoUrl.trim() }),
        })
        .then((data) => {
          if (id !== lookupId.current) return;
          setLookup({ state: "ready", data });
          setExistingBranch((current) => (data.branches.includes(current) ? current : data.defaultBranch));
        })
        .catch((error) => {
          if (id !== lookupId.current) return;
          setLookup({ state: "error", message: error instanceof ApiError ? error.message : "Could not check the token" });
        });
    }, LOOKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [token, repoUrl, tokenReady, repoReady, linked, project.id]);

  const branch = target === "new" ? newBranch.trim() : existingBranch;

  // Preview the push for the selected branch.
  const lookupReady = lookup.state === "ready" && lookup.data.canPush;
  useEffect(() => {
    if (!lookupReady || !branch) {
      setPreview({ state: "idle" });
      return;
    }
    const id = ++previewId.current;
    setPreview({ state: "loading" });
    const timer = setTimeout(() => {
      api
        .post<PushPreview>(`/projects/${project.id}/github/preview`, {
          token: token.trim(),
          branch,
          ...(linked ? {} : { repoUrl: repoUrl.trim() }),
          ...(overwrite ? { overwrite: true } : {}),
        })
        .then((data) => {
          if (id === previewId.current) setPreview({ state: "ready", data });
        })
        .catch((error) => {
          if (id === previewId.current) {
            setPreview({ state: "error", message: error instanceof ApiError ? error.message : "Could not load the changes" });
          }
        });
    }, SYNC_WAIT_MS / 3);
    return () => clearTimeout(timer);
  }, [lookupReady, branch, overwrite, token, repoUrl, linked, project.id]);

  const hasChanges = preview.state === "ready" && preview.data.added.length + preview.data.modified.length > 0;
  const hasConflicts = preview.state === "ready" && preview.data.conflicts.length > 0;
  const ready = lookup.state === "ready" && lookup.data.canPush && !!branch && !!message.trim() && hasChanges && (!hasConflicts || overwrite);

  const push = useMutation({
    mutationFn: async () => {
      setPhase("saving");
      await new Promise((resolve) => setTimeout(resolve, SYNC_WAIT_MS));
      setPhase("pushing");
      return api.post<PushResult>(`/projects/${project.id}/github/push`, {
        token: token.trim(),
        message: message.trim(),
        branch,
        ...(linked ? {} : { repoUrl: repoUrl.trim() }),
        ...(overwrite ? { overwrite: true } : {}),
      });
    },
    onSuccess: () => {
      storeToken(remember ? token.trim() : null);
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    },
    onSettled: () => setPhase("idle"),
  });

  const result = push.data;
  const error = push.error instanceof ApiError ? push.error : null;
  const busy = phase !== "idle";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready && !busy) push.mutate();
  }

  const branches = lookup.state === "ready" ? lookup.data.branches : [];

  return (
    <Modal
      title="Push to GitHub"
      description={
        linked
          ? `Changed files go to ${linked.owner}/${linked.repo} as one commit.`
          : "The project is not linked to a repository yet. Choose where to push."
      }
      onClose={onClose}
      width="max-w-lg"
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-ok/10 p-4 text-base">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-ok" />
            <div>
              <p className="font-medium">
                Commit created in branch {result.branch}
                {result.newBranch && " (new branch)"}
              </p>
              <p className="mt-1 text-muted">
                New files: {result.added}, changed: {result.modified}, unchanged: {result.unchanged}.
              </p>
              <a
                href={result.commitUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1.5 font-medium text-accent-ink hover:underline"
              >
                Open the commit on GitHub <ExternalLink size={16} />
              </a>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <ErrorNote>{error.message}</ErrorNote>}
          {!linked && (
            <Field
              label="Repository"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              disabled={busy}
            />
          )}

          <div className="space-y-2">
            <Field
              label="GitHub token"
              type="password"
              autoComplete="off"
              placeholder="github_pat_…"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={busy}
              hint={
                <>
                  You need a token that can write to the repository (Contents: Read and write).{" "}
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent-ink hover:underline"
                  >
                    Create a token
                  </a>
                  . The server uses it once and does not keep it.
                </>
              }
            />
            {lookup.state === "loading" && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <LoaderCircle size={16} className="animate-spin" /> Checking the token and loading branches…
              </p>
            )}
            {lookup.state === "ready" && lookup.data.canPush && (
              <p className="flex items-center gap-2 text-sm text-ok">
                <CheckCircle2 size={16} /> The token works: it can write to {lookup.data.repo.owner}/{lookup.data.repo.name}
              </p>
            )}
            {lookup.state === "ready" && !lookup.data.canPush && (
              <p className="flex items-center gap-2 text-sm text-warn">
                <TriangleAlert size={16} /> This token cannot write to the repository
              </p>
            )}
            {lookup.state === "error" && (
              <p className="flex items-start gap-2 text-sm text-bad">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {lookup.message}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="accent-[rgb(var(--accent))]"
              />
              Remember the token in this browser
            </label>
          </div>

          <fieldset className="space-y-2" disabled={busy || lookup.state !== "ready"}>
            <legend className="mb-1 text-sm font-medium text-muted">Where to push</legend>
            <div className={cn("grid gap-2 sm:grid-cols-2", lookup.state !== "ready" && "opacity-50")}>
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-base transition",
                  target === "existing" ? "border-accent bg-accent/10" : "border-line hover:border-faint",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="target"
                    checked={target === "existing"}
                    onChange={() => setTarget("existing")}
                    className="accent-[rgb(var(--accent))]"
                  />
                  To an existing branch
                </span>
                <select
                  value={existingBranch}
                  onChange={(event) => {
                    setExistingBranch(event.target.value);
                    setTarget("existing");
                  }}
                  aria-label="Branch"
                  className="field py-1.5"
                >
                  {branches.length === 0 && <option value="">—</option>}
                  {branches.map((name) => (
                    <option key={name} value={name}>
                      {name}
                      {lookup.state === "ready" && name === lookup.data.defaultBranch ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-base transition",
                  target === "new" ? "border-accent bg-accent/10" : "border-line hover:border-faint",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="target"
                    checked={target === "new"}
                    onChange={() => setTarget("new")}
                    className="accent-[rgb(var(--accent))]"
                  />
                  <GitBranch size={16} className="text-muted" />To a new branch
                </span>
                <input
                  value={newBranch}
                  onChange={(event) => {
                    setNewBranch(event.target.value);
                    setTarget("new");
                  }}
                  aria-label="New branch name"
                  className="field py-1.5 font-mono text-sm"
                />
              </label>
            </div>
            <p className="text-sm text-faint">
              {target === "new"
                ? "The default branch stays the same. You can open a pull request later."
                : "The commit goes straight to the selected branch."}
            </p>
          </fieldset>

          <PreviewBlock preview={preview} overwrite={overwrite} onOverwrite={setOverwrite} disabled={busy} />

          <Field
            label="Commit message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={500}
            disabled={busy}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!ready || busy}>
              <GitCommitHorizontal size={18} />
              {phase === "saving" ? "Saving edits…" : phase === "pushing" ? "Pushing…" : "Push"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function FileList({ title, tone, paths }: { title: string; tone: string; paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <div>
      <p className={cn("mb-1 text-sm font-medium", tone)}>
        {title} · {paths.length}
      </p>
      <ul className="space-y-0.5 font-mono text-sm text-muted">
        {paths.slice(0, 8).map((path) => (
          <li key={path} className="truncate" title={path}>
            {path}
          </li>
        ))}
        {paths.length > 8 && <li className="text-faint">and {paths.length - 8} more…</li>}
      </ul>
    </div>
  );
}

function PreviewBlock({
  preview,
  overwrite,
  onOverwrite,
  disabled,
}: {
  preview: Preview;
  overwrite: boolean;
  onOverwrite: (value: boolean) => void;
  disabled: boolean;
}) {
  if (preview.state === "idle") return null;
  if (preview.state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle size={16} className="animate-spin" /> Checking what changed…
      </p>
    );
  }
  if (preview.state === "error") {
    return (
      <p className="flex items-start gap-2 text-sm text-bad">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {preview.message}
      </p>
    );
  }

  const { added, modified, conflicts, unchanged } = preview.data;
  if (added.length + modified.length + conflicts.length === 0) {
    return (
      <p className="rounded-lg bg-raised px-3 py-2.5 text-base text-muted">
        Nothing to push: the project files match the repository ({unchanged}).
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border border-line bg-canvas p-3">
      <p className="text-sm font-semibold uppercase tracking-wider text-faint">What will be pushed</p>
      <FileList title="Changed" tone="text-accent-ink" paths={modified} />
      <FileList title="New" tone="text-ok" paths={added} />
      {conflicts.length > 0 && (
        <div className="space-y-2 rounded-lg bg-warn/10 p-2.5">
          <FileList title="Also changed on GitHub" tone="text-warn" paths={conflicts} />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={overwrite}
              disabled={disabled}
              onChange={(event) => onOverwrite(event.target.checked)}
              className="mt-0.5 accent-[rgb(var(--accent))]"
            />
            <span>Replace the GitHub versions with mine (other people's edits in these files will be overwritten)</span>
          </label>
        </div>
      )}
      {unchanged > 0 && <p className="text-sm text-faint">Unchanged: {unchanged}</p>}
    </div>
  );
}
