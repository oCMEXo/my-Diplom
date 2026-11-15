# WebSocket sync protocol

Documents (code, board, Markdown) are synced through [Hocuspocus](https://tiptap.dev/docs/hocuspocus):
the `apps/collab` server listens on `ws://<host>:1234` (see [ADR-002](adr/002-sync-via-hocuspocus.md)).
The protocol is the binary y-protocols/sync over WebSocket, implemented by the client library
`@hocuspocus/provider` (or anything compatible with `y-websocket`); it is normally not touched by hand.

## Connecting

One `Y.Doc` per file (see [ADR-001](adr/001-one-yjs-doc-per-file.md)).
The document name is the **file id** (uuid) from the `files` table.

```ts
import { HocuspocusProvider } from "@hocuspocus/provider";

const provider = new HocuspocusProvider({
  url: "ws://localhost:1234",
  name: fileId, // files.id
  token: accessToken, // the same JWT access token as for the REST API
});
```

The client sends `token`, the access token issued by `/auth/login` or `/auth/register`. The server:

1. Checks the JWT signature and expiry (`JWT_ACCESS_SECRET`).
2. Finds the file by `documentName` and takes its `projectId`.
3. Checks that the user is a member of the project (`project_members`).
4. If the role is `viewer`, marks the connection as read-only: the server accepts and sends out sync
   for reading, but ignores and does not save edits from this connection (the client UI sets the
   editor to `readOnly` itself; the server is only a safety net).
5. If the user is not a member or the file is not found, the connection gets `permission-denied` and
   is not authorized.

## Storage

The `@hocuspocus/extension-database` extension loads and saves the document state as a binary Yjs
snapshot in the `files.yjs_state` column (bytea). Saving is debounced (Hocuspocus waits after the last
edit before writing to the database), so tests and checks should wait a second or two after the last
edit before reading `yjs_state` from Postgres directly.

## Cursors and presence (awareness)

Cursor positions and presence go through the awareness protocol built into Hocuspocus/Yjs. No extra
server code is needed; the client provider calls `provider.setAwarenessField(...)`.

## The chat is separate

The project chat does NOT go through this protocol: messages are written to PostgreSQL through REST
(`apps/api`) and sent out as a plain WebSocket event, without a CRDT (see
[ADR-002](adr/002-sync-via-hocuspocus.md)).

## Project events: `GET /ws` (apps/api)

A channel separate from document sync: real-time JSON events for the whole project, such as new chat
messages, member presence and code run output (see [ADR-003](adr/003-code-execution-docker-queue.md)).

```
ws://<api-host>:3001/ws?projectId=<uuid>&token=<access JWT>
```

The token is in the query because the browser `WebSocket` cannot send headers. The server checks the JWT
and project membership; on failure it closes the connection with code `4401` (bad token) or `4403` (not
a member). On `4401` the client refreshes the token and reconnects; on `4403` it does not retry.

If access is taken away while the connection is open, the server closes it with code `4410` and the
reason `removed` (the member was removed), `left` (they left themselves) or `deleted` (the project was
deleted); the client does not reconnect and goes to the project list. A role change or a member leaving
is sent to the others as `{ "type": "project.members", "projectId": "…" }`, and the client reloads the
project. The same event comes when a new member joins by a link. Creating, renaming, deleting or
restoring a file, and an import, are sent as `{ "type": "project.files", "projectId": "…" }`, and the
client reloads the file tree and the trash. The sync server gets the same change through Redis (channel
`access-changes`): it closes the project's document connections with code `4403`, or with code `4205`
on a role change, after which the provider reconnects with the new role.

A server message is one JSON event:

```json
{ "type": "message.created", "message": { "id": "…", "projectId": "…",
  "author": { "id": "…", "name": "Vlad", "isGuest": true },
  "body": "hello", "createdAt": "2026-10-02T09:37:52.108Z" } }
```

Events only go out (server → client): messages are sent with `POST /projects/:projectId/messages`, and
the history is paged with `GET /projects/:projectId/messages?before=<messageId>&limit=50`. After a
reconnect the client asks for the last page again to pick up what it missed. The broadcast is in memory
in one API process for now; to scale horizontally it would have to move to Redis pub/sub.

### Code run events

The same JSON frames, with a type that starts with `run.`. The runner publishes them to Redis, and the
API forwards them to all project members:

```json
{ "type": "run.started",  "runId": "…", "projectId": "…", "fileId": "…",
  "language": "python", "startedBy": { "id": "…", "name": "Anna" } }
{ "type": "run.output",   "runId": "…", "projectId": "…", "fileId": "…",
  "stream": "stdout", "chunk": "step 0\n" }
{ "type": "run.finished", "runId": "…", "projectId": "…", "fileId": "…",
  "status": "error", "exitCode": 1, "durationMs": 2400,
  "errorLine": 5, "truncated": false }
```

`status` is `ok`, `error`, `timeout` or `failed` (the container could not start). `errorLine` is the
line number of the error from the trace (for `error`); the client highlights that line in the editor. A
run is started with `POST /projects/:projectId/files/:fileId/run` with the body `{ "code": "…" }` and the
answer `202 { "runId": "…" }`.

### Presence (who is online)

Every time a member connects or disconnects, the server sends the current list to everyone connected to
the project. One person in several tabs is counted once; the list is sorted by name:

```json
{ "type": "presence.updated", "projectId": "…",
  "users": [ { "id": "…", "name": "Anna", "isGuest": false },
             { "id": "…", "name": "Vlad", "isGuest": true } ] }
```

The first event comes right after a successful connection (it includes the person who connected), so the
client needs no separate "who is here" request.

This is the only message the client sends into this channel itself: which file it has open now.
Following another member works through it.

```json
{ "type": "presence.file", "fileId": "…" }
```

`null` means the file was closed. The server remembers the file for each connection and, when it changes,
sends the new list, where the person has a `fileId` field; with several tabs, the one with an open file is
used. Cursors and selections in the editor go another way: through the Yjs awareness protocol on the
connection to the sync server.
