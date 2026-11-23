# Guide: run code and read the output live

A run has two parts. You ask the API to run a file with a REST call, and it answers at once with a
`runId`. The output comes later, in pieces, over the project WebSocket `GET /ws`, to everyone who has
the project open. This guide puts both parts together in one script.

The script is [examples/run-code.mjs](../examples/run-code.mjs). It needs Node.js 22 (it uses the
built-in `fetch` and `WebSocket`) and a running code runner (`pnpm dev:runner`, which needs Docker).

```bash
node docs/api/examples/run-code.mjs
```

Real output:

```
WebSocket is open
Run accepted: 64b9139a-0f00-4f2f-8748-46662ff5539f
run.started by Script (python)
[stdout] Hello from the sandbox 0
Hello from the sandbox 1
Hello from the sandbox 2
run.finished: status=ok, exit code=0, 827 ms
```

## Step by step

### 1. Check that running is allowed

`GET /features` says how the server runs code:

| `run` | Meaning |
|---|---|
| `open` | Anyone signed in can run code |
| `code` | An access code is needed. Check it with `POST /run-access` and send it in the `X-Run-Code` header |
| `off` | Running code is turned off |

```js
const features = await call("GET", "/features");
```

On the live demo `run` is `code`. Ask the author for the code and start the script with
`RUN_CODE=… API_URL=https://35-228-155-63.sslip.io/api node docs/api/examples/run-code.mjs`.

### 2. Prepare a project and a file

```js
const { tokens } = await call("POST", "/auth/guest", { body: { name: "Script" } });
const project = await call("POST", "/projects", { token, body: { name: "Run from a script" } });
const file = await call("POST", `/projects/${project.id}/files`, { token, body: { path: "hello.py", type: "code" } });
```

### 3. Open the WebSocket first

Connect before you start the run, or you may miss the first events. A browser WebSocket cannot send
headers, so the token goes in the query string:

```
ws://localhost:3001/ws?projectId=<projectId>&token=<accessToken>
```

```js
const socket = new WebSocket(`${API.replace(/^http/, "ws")}/ws?projectId=${project.id}&token=${encodeURIComponent(token)}`);
```

If the token is wrong the server closes the socket with code `4401`; if the user is not in the
project, with `4403`.

### 4. Listen for run events

Every frame is JSON with a `type`:

| `type` | Fields |
|---|---|
| `run.started` | `runId`, `fileId`, `language`, `startedBy` |
| `run.output` | `runId`, `stream` (`stdout` or `stderr`), `chunk` |
| `run.finished` | `runId`, `status` (`ok`, `error`, `timeout`, `failed`, `stopped`), `exitCode`, `durationMs`, `errorLine`, `truncated` |

```js
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "run.output") process.stdout.write(`[${data.stream}] ${data.chunk}`);
  if (data.type === "run.finished") console.log(data.status, data.exitCode);
});
```

The same socket also brings chat messages, presence and member changes; skip types you don't need.

### 5. Start the run

`POST /projects/{projectId}/files/{fileId}/run` with the text to run in `code`. The other files of the
project go to the sandbox too, so `import` of another file works.

```js
const { runId } = await call("POST", `/projects/${project.id}/files/${file.id}/run`, { token, body: { code } });
```

The answer is `202 {"runId":"…"}`. Possible errors:

| Status | Message |
|---|---|
| 400 | Only JavaScript, Python, C, C++ and Java files can run |
| 403 | Running code on this site needs an access code. Enter the right code. |
| 429 | You started too many programs in a minute. Wait 25 s and try again. |
| 503 | Running code is not available right now. Please try a bit later. |

### 6. Stop a run (optional)

A program runs for at most 10 seconds. To stop it earlier, call
`POST /projects/{projectId}/runs/{runId}/stop`. Everyone gets `run.finished` with `status: "stopped"`.

## Limits

- 10 seconds per run, 64 KB of output (`truncated: true` when cut)
- The sandbox has no network and limited memory and CPU
- 20 runs per minute per person by default (429 when there are more)
