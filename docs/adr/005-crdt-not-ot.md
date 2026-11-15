# ADR-005: sync on a CRDT, not on OT

## Decision

Shared documents are stored as a CRDT (the Yjs library). OT is not used.

What the solution must do: editing offline and merging without losses (US-09, NFR-A2 in the BA), an edit
delay of at most 100 ms with 50 editors (NFR-P1), and a board in the same project (US-12).

| Criterion | OT (ShareDB) | CRDT (Yjs, chosen) |
|---|---|---|
| Editing offline | Limited: the server has to transform a long list of edits | Built in: copies merge without a central server |
| Not only text (board) | Needs a separate OT type | Shared types of the same library (maps, arrays) |
| Edit delay, p95, 50 users (one machine, loopback, chapter 4) | about 9 ms, up to 12.3 ms in one run | about 10 ms, up to 11.1 ms in one run |
| Risk | Complex transformation logic | The document grows with the edit history (risk R4 in the BA) |

## Why

On delay the two options are equal in the experiment, and both are far below the 100 ms threshold. The
network is not part of the measurement, so this compares the systems; it is not a promise for a real
network. Offline editing decides it: for a CRDT it is built in, for OT it becomes a separate hard task.

The downside is accepted on purpose: the document grows. This is risk R4, and its size is measured in
chapter 4.

The decision depends on US-09. The BA has a rule: if the survey shows that connection breaks are rare,
US-09 becomes a Should. Then the advantage of the CRDT gets smaller, but replacing the sync that is
already built would still not pay off.
