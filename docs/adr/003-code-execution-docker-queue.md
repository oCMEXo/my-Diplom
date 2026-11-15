# ADR-003: running code in Docker through a queue

## Decision

The API puts a job into a BullMQ queue, and a separate `runner` service takes it and runs the code in a
one-off container. The output goes back to everyone in the project over WebSocket.

Container limits: no network (`--network none`), a read-only file system, an unprivileged user, limits on
memory, CPU and the number of processes, and a timeout. The exact values are chosen when running code is
built.

| Option | Pros | Cons |
|---|---|---|
| **Docker on the server + a queue (chosen)** | Any language is added as an image; the queue smooths the load | Needs a machine with Docker; security risks are covered by limits |
| In the browser (Web Worker, Pyodide) | No server load, works offline | Pyodide is heavy; the output is not shared |
| External service (Judge0) | Quick to connect | Someone else's part of the system, less own work for the diploma |

The line number of an error is taken from the Node.js or Python stack trace and highlighted in Monaco.

## Chosen values and implementation details

The exact limits (chosen during implementation and checked by tests on real Docker, see
`apps/runner/src/executor.test.ts`):

| Setting | Value |
|---|---|
| Network | `--network none` |
| File system | `--read-only`, `/tmp` is a 16 MB tmpfs |
| User | `65534:65534` (nobody), `--cap-drop ALL`, `no-new-privileges` |
| Memory | 128 MB (no swap) |
| CPU / processes | 0.5 CPU, at most 64 processes |
| Time | 10 seconds, then `docker kill` |
| Output | at most 64 KB; the rest is dropped with an "output cut" note |

The project goes into the container as a **tar archive on stdin**: the container unpacks it into its own
tmpfs (`/tmp/p`, 16 MB in memory) and runs the chosen file (`node ./path` / `python ./path`) from there.
So the program sees the other project files (`require('./logger')`, `import helper`), and nothing is
written to the host's file system. The file path is passed in an environment variable instead of being
put into the command, so a file name cannot inject shell code. The first version ("code on stdin",
`node -`) did not let the program see other files and failed on any `require` of a neighbour module.

The runner finds the error location in the trace by the path of the file being run (`/tmp/p/<file>:N`
for Node, `File "/tmp/p/<file>", line N` for Python); frames from other project files are skipped. For
Python the last matching frame (the deepest) is taken, for Node the first one. Third-party packages
(`npm install`, `pip`) are not available in the sandbox: there is no network, and `node_modules` is not
sent.

A run uses the editor state: the client sends the current text of the file with the request (role
`editor` and above) instead of reading it from the saved snapshot, which lags behind by the Hocuspocus
debounce time.

The output is streamed: the runner publishes the events `run.started`, `run.output` and `run.finished`
to Redis (channel `run-events`), and the API forwards them to the project members over `/ws` (see the
[protocol](../websocket-protocol.md)). Running code stays a small feature of the product: a small button
in the editor header and a collapsible "Output" panel that all project members share.
