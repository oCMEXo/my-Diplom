import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCode, FolderPlus, GitBranch } from "lucide-react";
import type { ImportResult, Project, ProjectTemplate } from "@collab/shared";
import { api, ApiError } from "../lib/api";
import { Button } from "./ui/Button";
import { ErrorNote, Field } from "./ui/Field";
import { Modal } from "./ui/Modal";
import { Segmented } from "./ui/Segmented";

type Source = "empty" | "example" | "github";

export function projectNameFromRepoUrl(url: string) {
  const path = url.trim().replace(/[?#].*$/, "").replace(/^git@github\.com:/i, "").replace(/^https?:\/\//i, "");
  const segments = path.split("/").filter(Boolean);
  if (/^(www\.)?github\.com$/i.test(segments[0] ?? "")) segments.shift();
  return (segments[1] ?? segments[0] ?? "Imported project").replace(/\.git$/i, "");
}

export function CreateProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project) => void }) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<Source>("empty");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [template, setTemplate] = useState<ProjectTemplate>("python");
  const [created, setCreated] = useState<Project | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (source === "empty") return api.post<Project>("/projects", { name: name.trim() });
      if (source === "example") return api.post<Project>("/projects", { name: name.trim(), template });
      const project = created ?? (await api.post<Project>("/projects", { name: projectNameFromRepoUrl(url) }));
      setCreated(project);
      await api.post<ImportResult>(`/projects/${project.id}/import/github`, { url: url.trim() });
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onCreated(project);
    },
  });

  const ready = source === "github" ? url.trim() : name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready && !create.isPending) create.mutate();
  }

  return (
    <Modal title="New project" description="A shared place: files, chat and members together." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          label="How to start"
          value={source}
          onChange={setSource}
          options={[
            { value: "empty", label: "Empty project", icon: <FolderPlus size={22} /> },
            { value: "example", label: "With an example", icon: <FileCode size={22} /> },
            { value: "github", label: "From GitHub", icon: <GitBranch size={22} /> },
          ]}
        />
        {create.error && (
          <ErrorNote>
            {create.error instanceof ApiError ? create.error.message : "Could not create the project"}
            {created && " The project was created. You can open it and try the import again."}
          </ErrorNote>
        )}
        {source !== "github" ? (
          <>
            <Field
              key={source}
              autoFocus
              data-autofocus
              label="Name"
              placeholder="For example, Algorithms coursework"
              maxLength={200}
              value={name}
              onChange={(event) => setName(event.target.value)}
              hint={source === "example" ? "The project gets a short guide and a file you can run right away." : undefined}
            />
            {source === "example" && (
              <Segmented
                label="Example language"
                value={template}
                onChange={setTemplate}
                options={[
                  { value: "python", label: "Python" },
                  { value: "javascript", label: "JavaScript" },
                ]}
              />
            )}
          </>
        ) : (
          <Field
            key="url"
            autoFocus
            data-autofocus
            label="Repository link"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={create.isPending}
            hint="A public repository. The project takes its name, and its text files are copied in."
          />
        )}
        <div className="flex justify-end gap-2 pt-1">
          {created && create.error ? (
            <Button onClick={() => onCreated(created)}>Open the project</Button>
          ) : (
            <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={!ready || create.isPending}>
            {create.isPending ? (source === "github" ? "Loading…" : "Creating…") : source === "github" ? "Create and import" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
