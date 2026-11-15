# ADR-002: sync through Hocuspocus

## Decision

The sync server is Hocuspocus, as a separate service `collab`. On connect it checks the JWT and access to
the project, and it saves document snapshots to PostgreSQL.

| Option | Pros | Cons |
|---|---|---|
| **Hocuspocus (chosen)** | Ready-made hooks for auth and storage, a Redis extension | One more library in the stack |
| y-websocket | Minimal reference server for Yjs | Auth and storage have to be written by hand |
| Own protocol on Fastify | Full control | Weeks of work and a risk of sync bugs |

## Note

The chat does not use the CRDT: messages are written to PostgreSQL through REST and sent out as an event
over WebSocket. Chat history has to be paged, and in Yjs it would grow without limit.
