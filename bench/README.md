# bench

The bench for the research question of the diploma: Yjs (CRDT) against ShareDB (OT) under the same load.

Scenarios:

1. **Typing at the same time**: N ∈ {2, 5, 10, 25, 50, 100} users, two modes (edits in different places /
   everyone at the same position).
2. **Offline**: a client disconnects, makes K edits, then merges with the others.
3. **Document growth**: the size of the state and the log with different shares of deletions.
4. **Board**: moving shapes (a map of registers instead of text).

Metrics: latency (mean/p50/p95/p99), correctness (text hashes match, nothing lost), server CPU and memory,
traffic per edit, document size, merge time. Servers and bots run in separate processes, and there is a
check that the load generator itself is not overloaded (event loop lag).

## Running

```bash
pnpm --filter @collab/bench bench          # full set, about 30 minutes
pnpm --filter @collab/bench bench:quick    # quick check, about 2 minutes
pnpm --filter @collab/bench test           # convergence smoke tests
```

Settings (environment variables): `EDITS_PER_SECOND` (default 1). The `--only=growth` flag re-runs only
the document growth scenario.

## Results

- `results/latest.json`: raw data of all runs;
- `results/REPORT.md`: tables and charts;
- `results/charts/*.svg`: charts.

The interpretation, the limitations and the check of the hypothesis are in
[docs/thesis/04-research.md](../docs/thesis/04-research.md).
