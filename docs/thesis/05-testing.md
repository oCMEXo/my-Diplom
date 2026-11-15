# 5 Testing and security

## 5.1 Test levels

Table 5.1 lists the automated tests by level and package.

Table 5.1. Test levels

| Level | Tool | Where | Tests | What it checks |
|---|---|---|---|---|
| Unit and service | Vitest | `apps/api` | 185 | auth, projects and roles (including a project from an example), invitations and guests (deleting unused guest accounts), link previews for messengers, files and the trash (automatic cleanup after the retention period), instant revoking of access (closing the `/ws` of a removed member, a Redis message on removal, leaving, a role change and project deletion), chat, running code, the WebSocket hub and presence, forwarding events from Redis, GitHub import (parsing links, downloading, choosing files, writing to a Yjs document) and pushing changes (a fake GitHub: changed and new files, conflicts, a new branch, rights, token errors, a preview without side effects), branches (each with its own files and edits, reopening without a download, names with `/`, an event to all members, rights and name checks), the terminal (a ticket with the files of the active branch, rights), search in file content (line and column of a match, case-insensitive, only the active branch without the trash, boards and `node_modules`, limits and the truncation flag, rights), the run access code, and the version history (list and text for a viewer, 404 for outsiders, restore only by an editor and through the sync server on behalf of the person who asked, errors of that server) |
| Unit | Vitest | `infra/local-host` | 13 | the test hosting proxy: serving the site, `/api`, the `/collab` and `/terminal` WebSockets, caching, an error when the API is down, messenger bots sent to the preview page |
| Unit and integration | Vitest | `apps/collab` | 23 | access check on connecting to a document; revoking access by a Redis message (only the right person's and project's connections close, a member demoted to viewer reconnects read-only); version snapshots (at most every 5 minutes, no duplicates, at most 50, read from the database after a restart); restoring a version on a running server with a real Hocuspocus client: the text changes at the connected client and in the database, the previous text becomes a version, rights of a viewer and an outsider; an edit from the editor is saved as a version with its author, a board is not |
| Integration with real Docker | Vitest | `apps/runner` | 53 | sandbox settings, running code in real containers, handling queue jobs; terminal: the WebSocket protocol (tickets, forwarding input and output, limits), bash with a TTY in a real container (node and python with project files, no network, writing only to its own folders, Ctrl+C) |
| Unit | Vitest | `apps/web` | 84 | the board model (Yjs), SVG export, styles of other people's cursors, colours and avatars, parsing GitHub links, the file tree, fuzzy search, tabs, service addresses, run hints, the project name from a repository link, version time and size, languages (what happens to a file by its name, the language list, language names for Monaco) |
| Bench smoke tests | Vitest | `bench` | 10 | both systems converge in all research scenarios at small sizes |
| End-to-end (E2E) | Playwright | `e2e` | 44 | two real browsers work with the live system |

There are 412 tests in total; static checks are `tsc --noEmit` (strict mode) and ESLint over all packages.
The API and runner tests work with real PostgreSQL, Redis and Docker, not with stubs: a service "checked"
on stubs (mock objects) does not prove that a migration, a transaction or a `docker run` flag works.

All automated checks run in CI (`.github/workflows/ci.yml`): linters, types, tests with PostgreSQL and Redis
started, and then a separate E2E job that installs Chromium and starts the runner. If a test fails, CI turns
the failure into an annotation on the run, so it can be seen without opening the log.

## 5.2 End-to-end scenarios (Playwright)

1. Two people open one file; text typed by one appears at the other.
2. An invite link with the "view only" role: the viewer sees the edits, but their own input does not reach
   the owner.
3. A chat message reaches the other member; the "online" list shows two people.
4. Markdown document: a typed heading is shown in the other member's preview.
5. A shape drawn on the board appears at the other member, and undo removes it for both.
6. Running code: the result is visible to all members (needs a running runner and Docker; turned on with
   `E2E_RUNNER=1`).
7. Interface: a file is created through the dialog in the side panel, and the chosen theme switches and
   stays after a page reload.
8. Import: a public GitHub repository is pasted as a link when creating a project, its file appears in the
   project and its content in the editor (needs internet access; skipped without it).
9. Deleting a file from the side panel with a confirmation and restoring it from the trash with the
   "Restore" button.
10. A wrong GitHub token: the request reaches the real GitHub API, the user sees a clear explanation before
    pushing, and the "Push" button is disabled (needs internet access).
11. Files are shown in folders, and folders collapse.
12. The owner deletes a project, and a guest leaves it: the project disappears from the list.
13. Running code imports a neighbour file of the project (`require('./logger')`).
14. An invite link shows the project and the owner; a guest enters a name and gets into the project.
15. An unknown link and a project that is not available explain what happened.
16. The owner changes a member's role and removes them from the project.
17. A user changes their display name.
18. A file is found with Ctrl+P and renamed from the side panel.
19. A project with files opens on the README, and the tab title names the file.
20. Open files become tabs: switching and closing.
21. Branches: the owner switches an imported repository to another branch, and the second member's file
    list changes without a reload; going back to the default branch brings its files back (needs internet
    access).
22. Terminal: the bash prompt appears in the panel, `ls && node main.js` shows the project file and the
    result of running it; an endless loop is stopped by the "Ctrl+C" button in the panel header; Ctrl+\`
    closes the panel (needs the runner and Docker, `E2E_RUNNER=1`).
23. The owner demotes a member who has a file open to viewer, and "read only" appears for them at once;
    then removes them from the project, and their tab goes to the project list with the text "You were
    removed from the project …".
24. A board label is placed with one click of the "Text" tool: the input gets the focus and does not
    disappear, and after Enter a new shape appears on the board.
25. A new file, its deletion and a new member appear for the others without a reload; after a file is
    created, the keyboard is already in the editor.
26. A viewer is not offered to invite people; an error when creating a file stays in the dialog, and Tab
    does not leave it.
27. A guest is warned about what signing out means and saves the account: after that they sign in with
    email and password and see their project.
28. Deleting an account: a wrong password is rejected, the right one deletes the account; the "Data and
    privacy" page opens without signing in, and "Terms of use" opens from it.
29. Following a member: the page follows them to another file, and Esc turns it off.
30. Mentioning a line: `src/main.py:3` goes into a message, becomes a link at the other member and opens the
    file at that line.
31. The unread counter grows while the chat is hidden and resets when it is opened.
32. Archive: a ZIP with the text files and without boards is downloaded.
33. Edits without a connection: Playwright cuts the connection, both members keep working, and after it is
    back both have the same merged text.
34. The token expired during a connection break: on reconnect the client gets a new one, and the edits
    reach the others.
35. A server failure (502) when refreshing the token does not end the session; signing out in one tab ends
    it in the other too.
36. A shape on the board is drawn by touch (a browser context with touch input).
37. Signing up, creating a project and signing in again through the pages, not the API.
38. Another member's cursor is visible with their name; a replaced invite link does not work.
39. A program that waits for keyboard input gets an explanation (needs the runner and Docker,
    `E2E_RUNNER=1`).
40. Interface sizes: at a width of 1280 px no text is smaller than 12 px, file names and messages are 16 px;
    the header does not overflow next to an open search panel or on a 360 px phone.
41. The board without a mouse: a shape is added with a tool button from the keyboard, moved with the
    arrows, selected with square brackets and deleted with Delete (NFR-U3); export to PNG and SVG.
42. An endless loop started with the "Run" button is stopped with the "Stop" button before the 10-second
    limit (needs the runner and Docker, `E2E_RUNNER=1`).
43. Languages: the new-file dialog says what will happen to a file (`main.py`: highlighting and running,
    `main.go`: highlighting only, `notes.xyz`: unknown extension, plain text) and opens the list of all
    languages; the created `main.go` has its language in the header and no "Run" button.
44. A project from an example: in the new-project dialog the "With an example" option and JavaScript are
    chosen; the project opens on the "Getting started" guide, and `main.js` already has code and a "Run"
    button.

A successful commit push is checked only against a fake GitHub in the unit tests: checking it against a
real repository would need someone's token.

The separate "tests" `screenshots.spec.ts` and `ux-screens.spec.ts` do not check behaviour but take
screenshots: the first for the explanatory note (runs only with `SCREENSHOTS=1`), the second the error
screens for the UX specification (`UX_SCREENS=1`).

Each scenario creates its own users and project, so the tests do not depend on each other. A run of the
whole set (44 scenarios, including those that need the runner and internet access) takes about 8 minutes
including starting the servers. The tests use Redis database 1, so a runner started for development
(database 0) does not take their jobs.

**Run results.** In local runs the whole set passed. The chat-with-presence test failed twice in full runs
while the machine was busy with other work, and could not be reproduced in 20 single repeats, 4 full runs
in a row, or a stress run (24 repeats in 6 parallel workers, all passed). Reading the code of the presence
hub and the WebSocket client found no race condition that would explain the failure; the most likely cause
is an overloaded machine, but this is an assumption. In CI, E2E tests get one retry after a failure. The
code run test that checks shared output now first waits until the guest is shown as online: the run
output reaches others only over the live connection, and clicking Run before that connection was up made
the test fail now and then.

## 5.3 Security of running code

Running arbitrary code is the most dangerous feature of the platform, so it is isolated and limited
(details and alternatives in ADR-003). Table 5.2 lists the protective measures.

Table 5.2. Isolation measures for running code

| Measure | Implementation |
|---|---|
| No network | `--network none` |
| Read-only file system | `--read-only`, a 16 MB `tmpfs /tmp` for temporary files |
| Unprivileged user | `--user 65534:65534` |
| No kernel privileges | `--cap-drop ALL`, `--security-opt no-new-privileges` |
| Memory limit | 128 MB (no swap) |
| CPU limit | 0.5 core |
| Process limit | 64 (protection against a fork bomb) |
| Time | 10 seconds, then the container is killed (`docker kill`) |
| Output | at most 64 KB, the rest is dropped |
| The host is not touched | the project goes in as a tar archive on stdin and is unpacked into the container's tmpfs; the file name is passed in an environment variable |
| Only allowed languages | JavaScript and Python; other values are rejected before running |
| Rights | only a project member with the `editor` role or higher can run code |

The tests with real Docker check: no network, no writing to the root file system, running as an
unprivileged user, stopping an endless loop when the time limit runs out, cutting huge output, and that the
set of `docker run` flags contains all the limits above. The memory, CPU and process limits are checked at
the level of the start arguments, not by load tests (for example, a real fork bomb).

The terminal (section 3.6) runs in a container with the same measures (no network, a read-only root
system, `nobody`, no capabilities), but with limits for a session: 256 MB of memory, 128 processes, a
30-minute container life. Access to it is given by a one-time ticket that the API issues after checking the
role and (on a public address) the access code; the terminal server itself accepts neither tokens nor
project ids from the browser. Tests with real Docker check no network, no writing outside `/project` and
`/tmp`, the `nobody` user, and stopping a program with Ctrl+C.

**What is not covered.** The container uses the host kernel: a container escape through a kernel bug is
not prevented. For running untrusted code in public this is solved with stronger isolation (gVisor,
Firecracker), which is out of scope; the platform is meant for invited project members, not for anonymous
public execution, and running code is only a helper feature.

## 5.4 Access security

- Passwords are stored as `argon2id` hashes; access tokens are short-lived JWTs; refresh tokens are opaque
  random values, the database stores only their hash, and a new one is issued on every use (rotation).
- A user who is not in a project gets `404`, not `403`: the answer does not reveal that the project exists.
- The roles `owner > editor > viewer` are checked on the server: both in the REST API and when connecting
  to the sync server (for `viewer` the connection is read-only, and the server does not accept or save
  their edits). The viewer's local copy of the document is technically writable, but changes do not go to
  the server or reach others; an end-to-end test checks this (section 5.2, scenario 2).
- The `/ws` WebSocket checks the JWT and project membership before subscribing; on failure it closes with
  code 4401 or 4403.
- Revoking access works at once, not at the next connection: a removed member (or everyone, if the project
  is deleted) loses the open `/ws` (code 4410) and the connections to the project's documents, and a member
  demoted to viewer reconnects read-only. This is checked by tests of the hub, the services, the sync server
  (a Redis message closes only the right person's and project's connections) and by end-to-end scenario 23.
- The colour and name of another person's cursor come from another client and end up in dynamically
  created CSS; colour values are strictly checked (`#rrggbb`), and the name is escaped, which protects
  against style injection (a test in `cursor-styles.test.ts`). For the same reason, the board's SVG export
  escapes text and accepts only safe colours.
- Guest entry creates a temporary user without a real email or password (a technical address and a random
  password that nobody is told); a guest gets only the rights the invite link gives.

## 5.5 What was checked by hand and what was not

Table 5.3 shows the state of the areas that the automated tests do not fully cover.

Table 5.3. Manual checks and unchecked areas

| Area | State |
|---|---|
| Collaborative editing, roles, invitations, guests, chat, presence | Checked automatically and in the browser |
| Board, Markdown preview, cursors | Checked automatically, including E2E (scenarios 5, 4, 38) |
| Version history | Restoring at a connected client: an integration test with the Hocuspocus Node client; the history window and restoring in an open editor were checked by hand in one browser. There is no E2E test with two browsers |
| Client app build (PWA) | Builds; the service worker and the precache (110 files, about 13.5 MB) are created |
| PWA working offline (starting the app without a network) | **Not checked** in a browser: there is no E2E test, and we rely on Workbox's standard behaviour |
| Docker images api / collab / runner | Build; `api` was started and answers (section 5.6); the full `docker-compose` was not deployed |
| Deployment on Google Cloud | The site was deployed on 5 November 2026 following `docs/deploy-gcp.md`: one e2-medium machine in europe-north1, address `https://35-228-155-63.sslip.io`. Checked: the Let's Encrypt certificate, API answers, compressed site files (main one 1.08 MB), sync and terminal WebSockets passing through the proxy, and the terminal refusing without a ticket. Scenarios with signing in on the live site were not run automatically |
| Deployment on AWS | **Not checked** on a real account; `docs/deploy-aws.md` is a guide, not a deployment report |
| Load in browsers | Not measured (the research used Node.js clients, chapter 4) |
| Project open time (NFR-P2) | Measured (`e2e/tests/load-time.measure.ts`): a project with 200 files, an empty browser cache, a 10 Mbit/s link and 40 ms delay emulated in Chrome, the server on the same machine. With compressed files 2.0 s (median of 10 runs, limit 3 s), without compression 5.1 s; the very first run after the server started took 4.2 s. Not measured on a real network |
| Layout on a phone | Checked in the browser with emulated widths of 360 and 375 px (all main screens; at 360 px the editor header did not fit at first, fixed); not checked on a real phone |
| Text contrast | The colour tokens were recalculated by a script for a 4.5:1 ratio on the backgrounds where such text appears; red and accent text is not used on a highlighted row, where the ratio is lower (about 4:1). Contrast tests are not automated |

## 5.6 Building the containers

The service images are built from one `infra/docker/Dockerfile` (targets `app` and `runner`, the `APP`
argument). Checked locally: the `api`, `collab` and `runner` images build; the `api` image was started with
real PostgreSQL and Redis and answers requests (`/docs/json` returns 200); the Docker client is available
in the `runner` image. During the check a bug was found and fixed: the Prisma client was generated for
`runner`, which does not depend on it. The full stack through `docker-compose` on a server (Caddy,
migrations, RDS, S3/CloudFront) was not deployed.
