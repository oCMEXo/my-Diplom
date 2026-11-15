# Conclusion

## What was done

A web platform for working on projects together in real time was built. A project is a lasting shared
space: people join it by an invite link (also as a guest, without an account), and the members edit files
at the same time, see each other's cursors, write in the chat and see who is online. An existing project
can be brought in by pasting a link to a GitHub repository, and edits can be pushed back as a commit.
There are three file types: code (Monaco), a Markdown document with a live preview and a design board
(react-konva); running code and the terminal are small helper features in isolated Docker sandboxes. The
app works as a PWA: documents and data are cached locally, and edits made offline sync when the connection
is back.

The core of the product is a CRDT (Yjs) with the Hocuspocus sync server, one Yjs document per file; the
server checks rights at the connection level (roles `owner`, `editor`, `viewer`). The REST API (Fastify,
Swagger) handles accounts, projects, invitations, files, chat and running code; PostgreSQL stores the data
and the document snapshots, and Redis with BullMQ carries the run queue and the event channel.

CRDT and OT were studied on an own bench (Yjs and ShareDB, 138 runs): correctness, latency, server load,
traffic, document size, merging after offline work, and moving shapes on a board.

## Main findings of the research

1. **Correctness.** Both systems converged in all runs and no edits were lost, including the mode with the
   most conflicts and merging after offline work.
2. **Latency.** Up to 50 users both approaches have a few milliseconds (p95 at most 10.3 ms); at 100 users
   Yjs is about twice as slow as ShareDB (p95 of 28.7 against 13.4 ms), which stays well below the
   threshold people notice (about 100 ms).
3. **Traffic.** Yjs sends 2.2–2.9 times fewer bytes per edit (with edits in different places of the
   document).
4. **Server memory.** 11–22% higher for Yjs (10–17 MB).
5. **Offline.** The starting hypothesis that a CRDT merges faster was not confirmed: ShareDB merges faster
   (15–16 ms against 39–260 ms) and with less traffic. The advantage of a CRDT is architectural: merging
   needs no arbiter and works in any topology.
6. **Document size.** To open a document, Yjs needs 14–19 times more bytes than a ShareDB snapshot, and
   this amount grows with the edit history (tombstones), not with the size of the text; in total, though,
   Yjs stores 2.2–2.3 times less than ShareDB with its snapshot and log.
7. **Board.** For moving shapes there is no difference between the approaches.

The practical conclusion for the platform: choosing a CRDT is justified not by speed but by a simpler
architecture (no arbiter server, offline mode needs no separate mechanisms, less traffic); the price is a
larger state when a document is opened and the need for compaction or garbage collection for long-lived
documents.

## Limitations

- The research was done on one machine over loopback, the clients were Node.js processes, not browsers,
  and the servers ran without a database (details in section 4.5).
- There is one OT implementation (`json0`/`text0`); the explanation of the difference in merging after
  offline work is an assumption not checked by a separate experiment.
- The AWS deployment is described (ADR-004, `docs/deploy-aws.md`) but not checked on a real account; the
  live site runs on Google Cloud, and the containers build and run locally.
- Starting the app itself offline (service worker) is not covered by an automated test.
- Running code is protected at the container level but shares the kernel with the host; running untrusted
  code in public needs stronger isolation.
- The board has no pictures (file upload is not built).
- Import works only for public GitHub repositories. Pushing to GitHub does not delete or rename files in the
  repository and does not pull other people's changes back; it was checked against a fake GitHub in the
  tests, not against a real repository with a live token.
- Voice, video and screen sharing are deliberately not built: they are out of scope.
- One API instance: the WebSocket hub lives in the process memory; to scale horizontally it has to move to
  Redis pub/sub.

## Directions for further work

- Checking the "CRDT vs OT" pair on other implementations (Automerge, `ot-text`, `rich-text`), on a real
  network and with browser clients.
- Garbage collection and compaction of the Yjs history (`gc`, periodic snapshots) and measuring their
  effect on the state size.
- Uploading images and attachments (S3), comments on documents.
- Stronger isolation for running code (gVisor or Firecracker), more languages.
- Horizontal scaling: the Redis extension of Hocuspocus, sending events through Redis pub/sub.
- Voice channels and screen sharing (WebRTC), as a separate stage outside this work.
