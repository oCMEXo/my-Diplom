# @collab/web

React SPA: Vite, Monaco Editor + y-monaco + y-indexeddb (offline cache), the Hocuspocus provider for
real-time sync, TanStack Query for REST, Tailwind.

## What's in it

- Sign-up, sign-in and **guest entry without an account**
- Invite links to a project (`/join/:code`, like a Discord invite): the owner creates one, can replace
  it and choose the role (`editor`/`viewer`); plus invitation by email for a specific person
- A column of projects (like Discord servers), files by type, a dialog to create a file (code /
  document / board)
- A shared Monaco editor on top of Yjs: edits sync in real time between everyone who has the file open,
  with roles (`viewer` is read-only on the server); coloured cursors and selections with names
- Markdown documents: the editor and a live preview side by side (react-markdown)
- A design board (react-konva on top of Yjs): rectangle, ellipse, text, arrow, colours, moving and
  resizing, undo/redo, other people's cursors, export to PNG and SVG
- Project chat and a member list with an "online" dot (WebSocket `/ws`)
- Offline: PWA (the service worker caches the app together with Monaco, a manifest for installing), Yjs
  documents in IndexedDB, a cache of REST answers in localStorage; edits made offline sync when the
  connection is back
- Running code: a small button in the editor and a shared collapsible "Output" panel (everyone in the
  project sees the output), plus a terminal
- Dark and light themes (the choice is remembered), Inter and JetBrains Mono bundled with the app,
  responsive layout (sliding panels on narrow screens)
- Import of a public GitHub repository by link (into a project or when creating one) and pushing changes
  back as a commit (needs a GitHub token with write access)

## Limitations

- No pictures on the board (file upload is not built)
- The build puts all of Monaco in one chunk (~4 MB, 1.1 MB gzipped) and the PWA precache is about 13 MB:
  it works, but for production the set of languages should be trimmed
- Service worker updates: a new version is picked up on the next page load

## Local development

```bash
cp .env.example .env
pnpm --filter @collab/web dev
```

`apps/api` (REST) and `apps/collab` (sync) must be running too; see the root README.
