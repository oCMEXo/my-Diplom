# 3 Implementation

## 3.1 How the code is organised

The repository is a pnpm workspaces monorepo; all code is TypeScript. The `@collab/shared` package holds
Zod schemas (requests, responses, real-time events) and constants, and both the server and the client use
it, so the shape of the data is checked by the compiler on both sides and, at the server boundary, also at
run time. The `@collab/db` package holds the Prisma schema, the migrations and the client. Code quality is
checked by a linter (ESLint), type checking and automated tests; all three run in GitHub Actions on every
push and pull request, with PostgreSQL and Redis started for them.

## 3.2 REST API and auth

The API is built on Fastify; types and documentation come from the same Zod schemas
(`fastify-type-provider-zod`), so the OpenAPI specification (Swagger UI at `/docs`) does not drift from
the code. One error handler turns domain exceptions into HTTP responses with the right status.

Access checks live in one function that finds the role for a "project, user" pair and compares it with
the required one (`viewer < editor < owner`). For a non-member it answers "not found", not "forbidden",
so nobody can find out by trying which projects exist. The same logic is reused in the WebSocket endpoint
and in the sync server.

Authentication: argon2id for passwords; the access token is a short-lived JWT; the refresh token is a
random string of which the database stores only the SHA-256, and on refresh the token is replaced with a
new one (rotation). **Guest entry** creates an account with the `is_guest` flag, without a real email or
password (a technical address and a random password that nobody is told), and issues an ordinary pair of
tokens, so all the other code (rights, project membership, chat) works for guests without special cases.
An **invite link** is a random project code; `POST /join/:code` adds the caller to the project with the
role set for the link, and it is idempotent: following the link again does not change a role already
given. The owner can replace the code (the old link stops working) and change the role the link gives.

The link code is the right to join as an editor, so the server does not give it to a viewer
(`inviteCode: null`), and a viewer has no "Invite" button. The code changes when a member is removed or
demoted to viewer, and when a viewer link becomes an editor link: otherwise a person could get access
back with the old link or raise their own role.

A guest cannot get back into their account after signing out: they have no email and no password. So
signing out as a guest first warns about this, and `POST /auth/upgrade` adds an email and a password to
the same account, so the projects and the history stay. `POST /auth/delete-account` deletes the account,
its messages and the projects the person owns; a registered user confirms it with the password. Open
connections are closed as when someone is removed from a project, and the client erases its copies of the
documents in IndexedDB (the right to erasure, GDPR Art. 17).

On the client, the session must not be lost because of a server failure: tokens are erased only when a
refresh gets a 401, while a 429 or a 502 keeps the person signed in. The refresh uses rotation, so two
tabs must not do it at the same time: tabs queue through Web Locks, and the second one, after waiting,
reads the new pair from `localStorage`. The `storage` event carries signing in and out to the other tabs.
A WebSocket, unlike a request, cannot retry after a 401, so before every connection the client checks the
token's expiry and gets a new one if needed: after a long time offline, sync resumes by itself.

The email address is lower-cased already in the request schema, so `Anya@Mail.com` and `anya@mail.com`
are one person; existing records were converted by a migration. Signing in with an unknown address takes
as long as a wrong password: otherwise the response time would show who has an account. Inviting by email
does reveal in its answer whether the address is registered, so it has the same rate limit as signing in.

## 3.3 Sync server

The `collab` server is Hocuspocus [10] with a storage extension. The document name is the file id. On
connect, an auth hook checks the JWT signature, finds the file, checks project membership and turns on
read-only mode for the `viewer` role. The document snapshot is saved to `files.yjs_state` with a delay:
1 s after the last edit, but at least every 3 s during continuous typing.

Testing with real clients showed an important property of the CRDT architecture. A viewer client **can
change its Yjs document locally** (the local copy is always writable; instant response is built on that),
but the server does not accept or forward this edit, and it does not reach the storage. So read-only mode
on the server guarantees data integrity; it is not an interface lock. The viewer's editor is also set to
read-only on the client.

## 3.4 Client

**Code editor.** Monaco, bound to the Yjs document through `y-monaco`; Monaco and its background workers
(Web Workers) are bundled locally (not loaded from a CDN), which offline mode needs. Presence goes through
awareness: each client publishes a name and a colour, and other participants' cursors and selections are
drawn by CSS rules generated from the awareness state. Since this data comes from other clients, names and
colours are filtered before they reach CSS (only a strict colour format and safe name characters are
allowed), and this is covered by tests.

**Markdown documents.** The same editor in Markdown mode and a preview (`react-markdown`) that re-renders
on every edit, local or remote; raw HTML is not allowed in the preview.

**Design board.** Drawn on Canvas (`react-konva`), with the data in Yjs: a `Y.Map` of shapes by id (type,
position, size, colour, text) and a `Y.Array` with the layer order. Shapes: rectangle, ellipse, text,
arrow; moving, resizing, recolouring, deleting, undo/redo (`Y.UndoManager`, which undoes only your own
edits), participants' cursors, export to PNG and SVG. Shape properties are independent, so one person can
move a shape while another recolours it, and both changes are kept; when the same property is written
concurrently, one write survives, the same for everyone. Uploading pictures (S3) did not make it into the
scope; it is the first board feature the plan allows to cut.

**Offline.** The service worker (Workbox through `vite-plugin-pwa`) caches the app shell; the cache of
REST answers is saved to localStorage for a week so the project and file lists are available offline; the
body of each opened file is in IndexedDB. Signing out clears the request cache, so one user's data does
not stay on the device for the next person.

## 3.5 Chat, presence and real-time events

The chat is the `messages` table with two delivery paths: REST for writing and for the history (paging by
a cursor, the message id) and an event over the `/ws` WebSocket for live delivery. A message is first
written to the database and only then sent out, so a delivered message is always saved. The client joins
the POST response and the WebSocket echo by id, and after a reconnect it asks for the last page again to
pick up what it missed during the break.

The broadcast hub (a hub of WebSocket connections) keeps connections per project; it also keeps the list
of who is present (a user is counted once even with several tabs open) and sends a `presence.updated`
event on every join and leave. The same channel carries code run output. The token is passed in the query
string because the browser `WebSocket` cannot set its own headers; close code `4401` means a bad token (the
client refreshes it and retries), and `4403` means not a project member (the client does not retry).

## 3.6 Running code

A run request (`POST /projects/:id/files/:fileId/run`, role `editor` and above) carries the current text
of the file: the client sends it itself, because the saved snapshot lags behind the editor by the save
delay. The language is chosen by the file extension from one table in the `shared` package
(`describeLanguage`); the same table tells the interface what happens to the file: highlighting and
running (JavaScript, Python), highlighting only (38 more languages) or plain text. The "Supported
languages" window shows this table, and the new-file dialog warns about an unknown extension while the
name is still being typed. The API puts a job into a BullMQ queue, the `runner` service runs it in a
one-off container and publishes the events `run.started`, `run.output` and `run.finished` to Redis, and
`api` forwards them to the project's subscribers.

Table 3.1 lists the container limits; they are checked by automated tests on real Docker.

Table 3.1. Limits of the code run container

| Setting | Value |
|---|---|
| Network | off (`--network none`) |
| File system | read-only, `/tmp` is 16 MB in memory |
| User | `nobody` (65534), all capabilities dropped, `no-new-privileges` |
| Memory / CPU / processes | 128 MB without swap / 0.5 core / at most 64 |
| Time | 10 s, then the container is killed |
| Output | at most 64 KB |

The project goes into the container as a tar archive on standard input and is unpacked into the
container's own tmpfs in memory, so nothing is written to the host's file system, and the program sees the
other project files (`require('./logger')`, `import helper`, files in folders). The current file comes from
the editor (the latest text), the rest from the saved documents, up to 400 files and 3 MB. The path of the
file being run is passed in an environment variable and quoted, so a file name cannot inject shell code.
The error line number is taken from the trace by the path of the file being run (frames from other files
are skipped) and highlighted in the editor for everyone. Third-party packages cannot be installed: the
sandbox has no network. Tests check that the code cannot open a network connection, cannot write to the
root file system, does not run as root, and that an endless loop and too much output are limited.

Running code is deliberately a small feature: a small button in the editor header and a collapsible output
panel shared by all project members.

**Terminal.** Besides the Run button there is a live command line, like Git Bash: a panel at the bottom of
the project page (the terminal button in the header, or Ctrl+\`), where you can run `ls`,
`node main.js`, `python app.py`, press Ctrl+C and so on. The browser runs xterm.js, and the server runs
bash in a separate container with a real pseudo-terminal (TTY), so colours, line editing and full-screen
programs behave as usual.

It is built so that only `runner` has access to Docker, as before:

1. The browser asks the API for a terminal (`POST /projects/:id/terminal`, role `editor` and above). The
   API collects the text files of the active branch and puts them into Redis under a one-time random
   ticket (192 bits) for 60 seconds.
2. The browser connects over WebSocket to the terminal server in `runner` with this ticket. The runner
   takes the ticket with `GETDEL` (it will not work a second time), creates a container through the Docker
   Engine API and copies the project files into its tmpfs `/project` as a tar archive through the stdin of
   a helper `exec`.
3. Then `bash` starts through a second `exec` with a TTY; keystrokes and output travel over the WebSocket
   in JSON messages (`input`, `resize` / `status`, `ready`, `output`, `exit`). The output is decoded as a
   stream, so a multi-byte UTF-8 character split between two chunks is not broken.

The terminal container limits mean the same as for runs but are sized for a session: no network, a
read-only root system, the user `nobody`, all capabilities dropped, 256 MB of memory without swap,
0.5 core, up to 128 processes, `/project` of 64 MB and `/tmp` of 32 MB in memory. The container's main
process is a 30-minute `sleep`, so a session cannot live longer even if the runner crashes; when the panel
or the tab closes, the container is stopped and removed at once. A user can have at most two terminals at
once, and a server at most eight. The image (Node.js 22, Python 3, bash) is built by `runner` on the first
start. Edits in the terminal do not go back into the project: it is a sandbox with a snapshot of the
files, and the "New session with the current files" button takes a fresh snapshot.

**When something goes wrong.** A run container stops by itself (`timeout` inside it) 5 seconds after the
limit at which the runner kills it: this covers a crash of the runner itself. A run request does not wait
for the queue longer than 5 seconds if there is no connection to Redis (answer 503), and gets a 429 when
100 programs are already in the queue. The terminal output stops being read until the browser takes the
megabyte that has piled up, so `yes` does not fill the server's memory. The sync server starts without
Redis too: documents work, and revoking access on open connections starts working as soon as Redis
appears.

## 3.7 Deployment

The three Node services share one Dockerfile (a build argument picks the service); `runner` also gets the
Docker CLI and access to the host socket to start sandboxes, a conscious trade-off of ADR-004, which is
why the host runs nothing but the stack. `docker-compose.yml` starts `api`, `collab`, `runner`, Redis and
Caddy (automatic HTTPS and WebSocket proxying), and the migrations run as a separate one-off `migrate` job
(the `tools` profile); PostgreSQL is in RDS, the client app in S3 behind CloudFront. The step-by-step guide
and the GitHub Actions deployment workflow are `docs/deploy-aws.md` and `.github/workflows/deploy.yml`.

**Deployment on Google Cloud.** The running instance is deployed in a simpler way: everything is on one
Compute Engine virtual machine (e2-medium, region europe-north1, in the EU as section 2.8 of the BA
requires), including PostgreSQL and Redis (`infra/gcp/docker-compose.yml`). Caddy serves the built site
and, on the same address, proxies `/api`, `/collab` and `/terminal`, like the local test hosting; the
address is built from the static IP through sslip.io, so no own domain is needed. The site is built on the
developer's computer, and the services on the machine from `git archive HEAD` (`infra/gcp/deploy.mjs`);
secrets are created on the machine on the first run and never reach the repository. Running code on the
public site needs the owner's access code.

**Test hosting on a local computer.** For a demo without a cloud there is `pnpm host:test`
(`docs/deploy-local.md`). It creates a separate database, builds the site with relative addresses
(`/api`, `/collab`), starts the API and the sync server on local ports and puts a small Node.js proxy in
front of them that serves the site, forwards `/api` and the `/collab` WebSocket connections and adds
security headers. One address for everything lets a single free Cloudflare tunnel carry the site outside
(terminals go through the same proxy under `/terminal`). Running programs and the terminal on the public
address work only with the owner's access code: at start a code like `K7PX-M2QD-9WRT` is generated and
printed in the hosting window; the API accepts run and terminal requests only with the `X-Run-Code`
header, comparing it in constant time, and the code check (`POST /run-access`) is rate-limited like
sign-in. `GET /features` reports the mode (`open`, `code` or `off`), and the interface asks for the code
once. Rate limits are on as well (a general one and a stricter one for sign-in, sign-up and guest entry),
and the service ports listen only on `127.0.0.1`. The proxy is covered by tests (routing, WebSocket,
caching, an error when the API is down), and the rate limits, turning running off and the access code by
API tests.

**Compressing the site.** The Monaco editor makes the main file of the site large: 4.75 MB. Before the
proxy starts, a compressed copy (`.br`, `.gz`, the `compressWebRoot` function) is put next to every text
file, and the browser receives 1.08 MB. Compression runs once, not on every request. On a 10 Mbit/s link a
project with 200 files opens in 2.0 s instead of 5.1 s (section 5.5).

## 3.8 GitHub: import and pushing changes

**Import.** To share an existing project, it is enough to paste a link to a public repository: into an
empty project ("Import from GitHub") or right when creating a project ("From GitHub"). The usual forms
work: `https://github.com/o/r`, with `.git`, a branch link `…/tree/dev`, `git@github.com:o/r.git` and the
short `o/r`.

The server downloads the repository archive and creates a project file for each text file, writing the
content straight into a stored Yjs document. So after an import the file opens for all participants as an
ordinary shared document. The repository is taken "as it is": only the `.git` and `node_modules` folders,
OS junk files, binary files (and files not in UTF-8) and files over the limits are skipped. Markdown files
become documents, the rest become code, and the language is chosen by the extension. Files that already
exist in the project are not overwritten. The result window names the skipped files, and when a link to
another repository is pasted into an already linked project, it warns that the files will be mixed.

For files from the repository the git hash of the content is stored (`source_sha`), and the project keeps
the repository link (`github_owner`, `github_repo`, `github_branch`).

Downloading from a link given by a user is a potentially dangerous operation, so there are limits:

- **SSRF.** Only the owner and repository names are parsed from the link (strict regular expressions), and
  the server builds the download address itself:
  `https://codeload.github.com/<owner>/<repo>/zip/<branch>`. Redirects are accepted only to `github.com`
  and `codeload.github.com` over HTTPS (at most three).
- **Sizes.** The archive is up to 25 MB (the download stops when it is exceeded), at most 500 files, each
  up to 512 KB, and up to 10 MB of unpacked text in total; when the limit is hit, files closer to the root
  are kept.
- **Paths.** Paths with `..`, backslashes, and paths that are too long are dropped.
- **Rights.** Only a member with the editor role or higher can import.

**Pushing changes.** The "Push to GitHub" button creates a commit in the project's repository through
GitHub's REST API (the Git Data API), without git installed on the server. The user enters a GitHub
personal token with write access; the server uses it in one request to `api.github.com`, does not store it
and does not log it (the browser remembers the token only if the user explicitly agrees). It works like
this:

1. The server reads the current content of the project files from the saved Yjs documents. The sync
   server writes edits to the database within three seconds, so the interface waits 3.5 seconds before
   pushing.
2. The tree of the target branch on GitHub is fetched. For each file the git hash of the content is
   computed and compared with the tree: if it matches, the file has not changed; otherwise, if the file was
   edited here (the hash differs from the one recorded at the last sync), it is sent as changed or new.
3. **Protection against overwriting other people's work.** If a file changed both here and on GitHub after
   the sync, the push stops with a list of the files; they can be replaced only with explicit consent (the
   "Replace the GitHub versions with mine" checkbox). Files not touched here are never sent, so other
   people's commits in them stay.
4. A new tree is created on top of the current one, then a commit, and the branch is updated without
   `force`. If the given branch does not exist, it is created from the default one (a handy safe option:
   push the edits to a new branch).
5. After success the new hashes are remembered, and the next push includes only new edits. If the project
   is not linked to a repository yet, the link is given at the first push.

Boards are not pushed to the repository (they are not text files), and empty new files are skipped. Not
supported: deleting files in the repository (a file deleted in the project stays on GitHub), renaming (a
new file is created), private repositories on import, pulling other people's changes back from GitHub.

**Branches.** A project imported from GitHub can be switched to any branch of the repository (the branch
item in the project menu). Each branch has its own set of files: the `files` table has a `branch` column,
and path uniqueness is checked within the "branch, path" pair. A branch opened for the first time is
downloaded from GitHub; going back to a branch opened before downloads nothing: the files are shown as
they were left, with edits not pushed yet. The active branch is shared by all participants: the server
sends a `project.branch` event, and the others' file lists update by themselves. New files, running code
(neighbour files for `require`) and pushing to GitHub work only with the files of the active branch. The
owner and editors can switch the branch; the branch name is checked (no `..`, spaces or a leading `-`).

## 3.9 Trash, members, file search

- **Trash.** Deleting a file does not erase it: the file is marked (`deleted_at`), its path moves to
  `.trash/<id>/…`, and the original is kept in `trashed_path`. This way the file name can be taken by a new
  file at once, and a restore brings the path back (and refuses with a clear message if the name is taken).
  Files in the trash are not opened by the sync server and do not take part in code runs or GitHub pushes.
  Only the owner can delete a file from the trash for good.
- **Automatic trash cleanup.** A file that has been in the trash longer than the retention period (30 days,
  the `TRASH_RETENTION_DAYS` variable) is deleted for good. A timer runs in the API process (`server.ts`,
  right at start and then every hour) and calls `purgeExpiredTrash`, which deletes expired files in
  batches of 500, so one pass does not hold a long lock. The timer is not part of `buildApp`, so tests
  delete nothing by themselves. The trash list returns `purgeAt` for each file, and the panel shows
  "deleted in N d".
- **Deleting unused guest accounts.** The same timer calls `purgeStaleGuests`: a guest account older than
  the retention period (30 days, `GUEST_RETENTION_DAYS`) that is in no project and has no live session left
  is deleted together with its chat messages, as when a person deletes their own account. The conditions
  are repeated in the delete query itself, so a guest who joined a project between the lookup and the
  delete keeps the account.
- **Members.** The owner changes a member's role (editor/viewer) and removes members from the project; a
  member can leave the project, and the owner can delete the whole project.
- **Instant revoking of access.** Rights are checked when a socket connects, so a change must reach
  connections that are already open. After a member is removed, leaves or the project is deleted, the API
  closes their `/ws` WebSocket with code `4410` and a reason (`removed`, `left`, `deleted`); the client
  does not reconnect but goes to the project list with an explanation ("You were removed from the project
  …"). The sync server is a separate process, so the API publishes the same change to the Redis channel
  `access-changes`, and the sync server closes this user's connections to the documents of this project
  (all of them when the project is deleted). On a demotion to viewer, the connections are closed with a
  "reconnect" code: the provider connects again at once and gets a read-only connection, and the
  `project.members` event updates the rights in the interface. If Redis is down, the change is still saved
  in the database, and open documents lose access on the next connection, as before.
- **Invitation page.** The public endpoint `GET /join/:code` returns only the project name, the owner's
  name and the link's role, to show them before signing in.
- **Profile.** `PATCH /auth/me` changes the display name (guests included).
- **Go to file.** Fuzzy search by path: the characters of the query must appear in order, a match in the
  file name weighs more than one in the folders, and on a tie the shorter path wins. It runs on the client
  over the file list that is already loaded.
- **Search in content.** Ctrl+Shift+F (or the "Search text" item in the project menu) opens a panel that
  searches the text of all files of the active branch. The search has to run on the server
  (`GET /projects/:id/search?q=…`, available to viewers too): file content is stored only as Yjs state, so
  each file is decoded to text. The query is plain text, not a regular expression, case-insensitive, from
  2 to 200 characters; files in the trash, boards and `node_modules` are skipped. The answer is limited to
  50 matches per file and 500 in total, with a truncation flag, and long lines are cut to a window around
  the match. The client waits for a pause in typing and does not put the results into the persisted query
  cache; clicking a match opens the file with `?line=…&col=…`, and the editor puts the cursor there, waiting
  for the text from the server if needed.
- **Push preview.** Before a commit, the "Push to GitHub" window shows what will go: changed and new files,
  files that also changed on GitHub (with a "replace with mine" checkbox), and how many files are
  unchanged. The calculation is the same for the preview and for the push itself
  (`POST /projects/:id/github/preview` creates nothing in the repository), so what is shown matches what is
  sent; the "Push" button is disabled while there is nothing to push or conflicts are not resolved.
- **File tabs.** Files open in the project are shown as tabs (kept in the browser, at most twelve; deleted
  files disappear by themselves), and closing the active tab switches to the neighbour.
- **Run hints.** If a program did not find a third-party package, the output panel explains that the
  sandbox has no network and no installed packages; after an error the output scrolls to the top, where the
  message itself is.

## 3.10 File version history

Snapshots of code and Markdown documents are taken by the sync server, in the same hook that saves
`files.yjs_state`. A snapshot is taken at most once every 5 minutes per file and only if the text differs
from the last version; a file keeps its last 50 versions, and older ones are deleted. The check is on the
path of every save (every 1–3 seconds while typing), so the last version of each open file is cached in
memory: until the interval has passed, the hook makes no database queries and does not even build the
document text. A version is stored in the `file_versions` table as **plain text**, not as Yjs state: it is
only shown and restored as text, and plain text has no CRDT edit history inside, so it is smaller. The
author of a version is the person whose edit was being saved at the time of the snapshot. Boards are not
part of the history.

The API returns the list (`GET …/files/:fileId/versions`, role `viewer` or higher) and the text of a
version (`GET …/versions/:versionId`). The "Version history" window in the editor header shows the
versions with a time like "5 minutes ago" and the author, and the selected one as a diff against the
current text (a read-only Monaco diff).

**Restoring during live editing.** The API cannot overwrite `yjs_state`: while the file is open, the
document lives in the sync server's memory, its next save would overwrite the API's write, and the
connected people's text would not change. So `POST …/versions/:versionId/restore` (role `editor` or
higher) checks the rights and passes the request to the sync server over HTTP (`COLLAB_URL`) with a
one-minute token of the same user; the server checks the role again, as for any connection. It opens the
document through a direct Hocuspocus connection (loading it from the database if nobody has the file open)
and replaces the text with the version in **one Yjs transaction**. Only the differing part is replaced
(the common start and end stay), so participants' cursors outside it stay where they are. For the
participants this is an ordinary edit: it reaches them as one update and merges with what they are typing
at the same moment. The text from before the replacement is saved as a version, so a restore can be undone
the same way. Then the document is saved to the database at once.

A detail found while testing in the browser: Monaco keeps one kind of line break per file and converts
everything it receives, so a version with `\n` in a document with `\r\n` (the editor creates those on
Windows) would drift from the text in the editor. Before the replacement, the version's line breaks are
converted to the ones the document uses now.

## 3.11 Working around a file

**Following a participant.** The client reports over `/ws` which file is open (`presence.file`), and the
server adds this to the presence list. Clicking an avatar turns on following: the page goes to the same
file, and the other person's cursor position is taken from awareness (a relative Yjs position is converted
to an absolute one) and scrolled into view. Following ends on Esc, when you type, when you open another
file by hand, and when the person leaves the project.

**Mentioning a line in the chat.** A button above the editor, the context menu and Alt+L insert
`path:line` into the message. When a message is shown, the pure function `createFileRefParser`
(`lib/file-refs.ts`) turns such fragments into links, but only for files of this project: `localhost:8080`
and `12:30` stay text. A name without a folder becomes a link only if there is exactly one such file. The
message body on the server does not change.

**Unread counter.** A timestamp is kept in `localStorage` per project and browser; no database is needed
for it. While the chat is hidden, new messages from other people increase the counter, and on opening the
project and after a connection break it is recalculated from the last page of messages.

**Project archive.** `GET /projects/:id/export` packs the text files of the active branch into a ZIP
(`fflate`) and is available to all members, viewers included. Boards are not in the archive: they are
saved from the board itself as PNG or SVG.

**Project from an example.** A new project can start not empty but from an example (the `template` field
in `POST /projects`): together with the project, in one database query, a short guide `README.md` and a
Python or JavaScript file ready to run are created. The content is stored as Yjs state right away
(`textToYjsState`), as with a GitHub import, and the project opens on the guide.

**Link previews.** A messenger builds a link card from the page's HTML and does not run the web app. So
the proxy (Caddy and the local test host) sends messenger bots, by the `User-Agent` header and only for the
start page and invite links, to `GET /preview/*` in the API. It returns a small page with Open Graph tags:
for a valid invitation "Name invites you to the project “Project”", otherwise the site description. Names
are escaped, and the site address is taken from the proxy headers and checked against the characters
allowed in a host name.

**Terms of use.** The `/terms` page is open without signing in, like the data page; the sign-in, sign-up
and invitation forms link to it. It describes acceptable use of running code (section 3.6) and what the
site owner can do when the rules are broken.

## 3.12 Things noticed during development

- **Content type on requests without a body.** The client wrapper around `fetch` always set
  `Content-Type: application/json`, even on requests without a body; Fastify rejects such a request as
  empty JSON. The bug showed up only on the first POST requests without a body (joining by link) and was
  found while testing in the browser.
- **Client errors as 500.** The common error handler first turned any non-domain error into a 500; now it
  keeps the status of the error itself (for example, 400 for an invalid body).
- **PID 1 in a container ignores its own kind.** The first version of the self-stop ran
  `exec timeout -s KILL …` and did not work: the process with PID 1 does not get even SIGKILL from processes
  in its own namespace, so the program ran forever. A test with real Docker found the bug; the container
  got an init process (`--init`), and the program is no longer PID 1.
- **A bench bug with split tokens.** While preparing the bench (chapter 4), a random insert position landed
  inside another token and split it, so the edit count diverged **the same way in both systems**; this
  pointed to a bug in the bench, not in an algorithm, and inserts were limited to token boundaries.
