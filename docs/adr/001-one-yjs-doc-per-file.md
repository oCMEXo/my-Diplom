# ADR-001: one Yjs document per file

## Decision

Each file has its own `Y.Doc` with one `Y.Text`. The file tree and the project settings are stored in
PostgreSQL and go through REST.

| Option | Pros | Cons |
|---|---|---|
| **Document per file (chosen)** | Only open files are loaded; small snapshots; simple access rights | Renaming and deleting files offline is not synced |
| One document per project | The whole project, tree included, works offline | The document grows without limit; everything loads at start |
| Document per file + a tree document | The best of both | Conflicting moves in the tree are a separate hard problem |

## Consequences

Offline, you can use the files that were already opened on this device. A tree document can be added
later if there is time.

The design board is also one `Y.Doc` per file: a `Y.Map` of shapes by id (type, position, size, colour,
text) and a `Y.Array` with the layer order. If two people move the same shape, the last change of each
property wins (an LWW register). A Markdown document works like a code file.
