# 1 Analysis

## 1.1 The problem

When several people work on the same piece of code, the usual ways of working together fit short, live
situations badly: classes, consultations, pair programming, looking at a bug "together at one screen".
Files are sent in messengers, and everyone works on their own copy; screen sharing leaves the others as
watchers, not co-authors; Git is made for asynchronous changes and needs an installed environment,
branches and merges, which is too much for a one-off shared edit.

Existing tools cover part of these situations, but with limits. Typical ones are the need to install a
client application, a session that depends on one host (when the host leaves, the session ends), and
lost or conflicting edits when the connection is unstable. The last one hurts most: a participant who
loses the connection for a few minutes should be able to keep working and then merge their changes
without resolving conflicts by hand.

The goal of the work is to build a web platform where participants open a shared project by a link, edit
files (code, documents, design boards) at the same time, see each other's presence and cursors, talk in a
chat and can work offline with automatic merging later; and then, using measurements on this platform, to
compare two families of sync algorithms: Operational Transformation (OT) and Conflict-free Replicated
Data Types (CRDT).

## 1.2 Existing solutions

The comparison uses the properties that matter for this task. The assessment is based on the public
documentation of the products; it should be checked against current versions, because the products keep
changing. The results are in table 1.1.

Table 1.1. The platform compared with existing solutions

| Property | This platform | VS Code Live Share | Replit / CodeSandbox |
|---|---|---|---|
| Installation | Not needed, a browser | VS Code needed (for the host) | Not needed, a browser |
| Working offline | Yes, with automatic merging | No | No |
| Depends on a host | No | The session lives while the host is online | No |
| Own server | Can be deployed | No | No |
| Joining without an account | Yes (guest entry by link) | Depends on the sign-in provider | An account is usually needed |
| File types | Code, Markdown document, board | Code | Code |

Products that do not edit code but have the same class of technical problems are also worth noting:
Google Docs (historically built on OT) and Figma (board objects are stored as sets of properties, and
conflicts are resolved by "last write wins" per property). Their experience shows that text needs
algorithms that preserve the user's intention under concurrent inserts, while objects with independent
properties need only much simpler registers.

The platform is not meant as a place for interviews or a one-off scratch pad for code, but as a lasting
project space: a project lives on, it has members, a chat history and a set of files of different types.
Running code is a helper feature in it, not the centre.

## 1.3 Consistency model of collaborative editing

A collaborative editing system replicates the document to the devices of all participants. Each
participant edits their copy at once, without waiting for the server (otherwise typing would feel tens
or hundreds of milliseconds late), and the edits are then sent to the others. Because of this, edits by
different participants are inevitably **concurrent**: none of them "knew" about the other when it was
made. The algorithm must provide three properties (the CCI model) [1]:

- **convergence**: after all edits are delivered, all copies of the document are the same;
- **causality preservation**: if edit B was made with edit A in view, then everyone applies A before B;
- **intention preservation**: applying an edit at any participant gives what the author meant in their
  state of the document, even if the document has changed by the time it is applied.

A simple example shows why this is not trivial. The document holds "ab"; one participant inserts "X"
before "b" (position 1), and another deletes "a" (position 0) at the same time. If you apply the other
person's edit to your document "as it is", the insert gets a position that no longer matches the
original intention. The two families of algorithms solve this differently: OT **transforms** an
operation against the concurrent ones, while a CRDT **removes the dependence on positions** altogether
by giving elements immutable identifiers.

## 1.4 Operational Transformation

The idea of OT (Ellis and Gibbs, 1989) [2] is that an operation on the document (`insert(pos, text)`,
`delete(pos, len)`), before it is applied to a state changed by a concurrent operation, is **transformed
by a transformation function** `T(a, b)`, which returns an operation `a'` equivalent to `a` given that `b`
has already been applied. Correctness requires the transformation property **TP1**: for concurrent
operations `a` and `b`, applying `a` and then `T(b, a)` gives the same result as applying `b` and then
`T(a, b)` [1].

Decentralised (peer-to-peer) operation also needs **TP2** (the result does not depend on the order of
transforming three or more concurrent operations), which in practice is extremely hard to satisfy: many
published transformation functions do not. So industrial systems (ShareDB [3] and Google Docs among them)
use a **central server** that sets one order of operations: the client sends an operation together with
the version number of the document it saw, and the server transforms it against all operations accepted
after that version and sends out the result. With this design TP1 is enough, and the complexity moves to
the server.

Consequences for the comparison with CRDTs:

- the server is **required** and is the point of serialisation: without it clients cannot exchange
  edits; a client has at most one operation sent but not yet confirmed by the server at any moment (the
  rest wait in a queue);
- the operation log of a document grows over time and is kept on the server; any version of the
  document can be rebuilt from it;
- offline work is possible only as a growing queue of operations, which the server transforms on
  reconnect against everything that happened in the meantime.

In the experimental part, the OT implementation is ShareDB with the `json0` type, in which text is
handled by the `text0` subtype (operations `si`, insert a string, and `sd`, delete a string), and object
values by the operations `oi`/`od` (insert and delete a value by key) [3, 4].

## 1.5 Conflict-free Replicated Data Types

CRDTs (Shapiro et al., 2011) [5] are data types designed so that concurrent changes **converge
automatically, without coordination**. There are two forms:

- **state-based** (CvRDT): replicas exchange states; the states form a **join semilattice**, and merging
  is taking the least upper bound (`join`). Merging must be **commutative** (`a ⊔ b = b ⊔ a`),
  **associative** (`(a ⊔ b) ⊔ c = a ⊔ (b ⊔ c)`) and **idempotent** (`a ⊔ a = a`). These three properties
  mean that the order, grouping and repeated delivery of updates do not change the result, so the
  network needs neither ordering nor "exactly once" delivery: "at least once, in any order" is enough;
- **operation-based** (CmRDT): replicas exchange operations that commute, given causally ordered
  delivery.

The guarantee these types give is called **strong eventual consistency**: replicas that have received the
same set of updates are in the same state, whatever the order in which they received them.

### 1.5.1 Sequence CRDTs for text

There are several algorithms for sequences (text): WOOT, Logoot, RGA, YATA and others. The common idea is
that each inserted character (or block of characters) gets a **globally unique immutable identifier** and
references to the neighbours it was inserted between; the position in the text is computed from these
references instead of being stored as a number. Then "insert after the character with identifier `x`"
stays meaningful whatever concurrent edits happen.

**YATA** (Nicolaescu et al., 2016) [6], which Yjs is based on, stores for each element an identifier
`(clientID, clock)`, where `clock` counts the elements inserted by this client (in effect Lamport's
logical clock [7] within one source), a left `origin` (the left neighbour at the time of the insert) and
a `rightOrigin`. When an element inserted concurrently with others at the same place is integrated, the
elements are ordered by `origin` and then by `clientID`, which gives the same order on all replicas. A
delete does not erase the element; it marks it as deleted (a **tombstone**), because other people's
concurrent edits may refer to it. Yjs makes tombstones cheaper: consecutive elements of one client are
merged into one block, and the content of deleted elements is dropped, leaving only the length.

Sync in Yjs [8] works through a **state vector**, a map `clientID → next expected clock`. On connect (or
on reconnect after offline work) the two sides exchange vectors and send each other only the missing
elements. Thanks to this, offline work needs no special mode: edits collected locally simply end up in the
state difference and merge at the next sync.

Consequences for the comparison with OT:

- a central server is **not needed for correctness** (clients could exchange edits directly); in the
  platform it is needed as a connection point, for access checks and storage, not as an arbiter of order;
- each character carries extra data, so the document state is **bigger** than the plain text and grows
  with the number of edits and deletes;
- merging after offline work is an ordinary exchange of the state difference.

### 1.5.2 Non-text data: a map of registers

Board objects (a shape is a set of properties: position, size, colour, text) do not need a sequence CRDT:
a `Y.Map` **map** fits, where each property is stored as a register in which "one write survives" (in
practice LWW, last-writer-wins): when the same property is written concurrently, exactly one of the
writes remains, the choice is deterministic (it relies on client identifiers) and **the same on all
replicas**, and writes to different properties do not conflict. The layer order is stored as a `Y.Array`
of shape identifiers. This model is simpler and cheaper than the text one, but it does not preserve
"intention" when two values of one property conflict: one of the two edits wins as a whole. For moving a
shape this is acceptable. A more general CRDT model for nested maps and lists (JSON documents) is
described in [9].

## 1.6 Conclusions of the chapter

1. The task needs instant local edits and automatic merging, including after offline work; resolving
   conflicts by hand is not acceptable.
2. OT relies on a central server as the arbiter of order and keeps an operation log; a CRDT can merge
   states without an arbiter at the cost of extra data in the document itself.
3. The platform uses **Yjs** (an implementation of YATA) with the **Hocuspocus** sync server [10], and the
   research part uses **ShareDB** (`json0`/`text0`) as the OT implementation.
4. The main hypothesis of the work, tested by measurements: a CRDT gives a comparable delay with a small
   number of users and wins in offline scenarios, but loses on document size and memory use.
