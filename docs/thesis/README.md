# Thesis text

Draft of the explanatory note in Markdown. The chapters describe the repository as it is; the numbers in
chapter 4 come from `bench/results/latest.json`.

| File | Section |
|---|---|
| [01-analytics.md](01-analytics.md) | 1 Analysis: the problem, analogues, OT, CRDT |
| [02-design.md](02-design.md) | 2 Design: requirements, architecture, data |
| [03-implementation.md](03-implementation.md) | 3 Implementation |
| [04-research.md](04-research.md) | 4 Research: CRDT vs OT |
| [05-testing.md](05-testing.md) | 5 Testing and security |
| [06-conclusion.md](06-conclusion.md) | Conclusion |
| [07-references.md](07-references.md) | References |
| [REVIEW.md](REVIEW.md) | Review notes on the text (not part of the note) |

Related materials: [ADRs](../adr), [WebSocket protocol](../websocket-protocol.md),
[database](../db), [bench results](../../bench/results/REPORT.md), Swagger at `/docs` on a running API.

The interface screenshots in `screenshots/` are taken automatically
(`SCREENSHOTS=1 pnpm --filter @collab/e2e e2e -- screenshots`). The diagrams in `diagrams/` are SVG; the
PNG copies are made with `pnpm --filter @collab/e2e exec node tools/render-diagrams.mjs`.
