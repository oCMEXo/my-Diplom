import { lineChart, type ChartSeries } from "./charts.js";
import { mean } from "./stats.js";
import type { BoardResult, GrowthResult, OfflineResult, TypingResult } from "./scenarios.js";

export interface BenchRun {
  meta: {
    startedAt: string;
    node: string;
    platform: string;
    cpu: string;
    cpuCount: number;
    memoryGb: number;
    config: Record<string, unknown>;
  };
  typing: TypingResult[];
  offline: OfflineResult[];
  board: BoardResult[];
  growth: GrowthResult[];
}

/** Above this event-loop lag in the bot processes the load generator, not the server, is the bottleneck. */
export const RIG_LAG_LIMIT_MS = 100;

const COLORS = { yjs: "#2563eb", sharedb: "#dc2626" } as const;
const NAMES = { yjs: "Yjs (CRDT)", sharedb: "ShareDB (OT)" } as const;

type SystemId = keyof typeof COLORS;

function group<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

function avg<T>(rows: T[], pick: (row: T) => number) {
  return mean(rows.map(pick));
}

const fmt = (value: number, digits = 1) => value.toFixed(digits);

function spread<T>(rows: T[], pick: (row: T) => number, digits = 1) {
  const values = rows.map(pick);
  return `${fmt(Math.min(...values), digits)}–${fmt(Math.max(...values), digits)}`;
}

function numeric(values: string[]) {
  return [...new Set(values)].sort((a, b) => Number(a) - Number(b));
}

function typingSeries(
  rows: TypingResult[],
  mode: string,
  pick: (row: TypingResult) => number,
  dashed = false,
  labelSuffix = "",
): ChartSeries[] {
  return (Object.keys(COLORS) as SystemId[]).map((system) => {
    const bySize = group(
      rows.filter((r) => r.system === system && r.mode === mode),
      (r) => String(r.clients),
    );
    return {
      name: `${NAMES[system]}${labelSuffix}`,
      color: COLORS[system],
      dashed,
      points: numeric([...bySize.keys()]).map((x) => ({ x, y: avg(bySize.get(x)!, pick) })),
    };
  });
}

export function buildCharts(run: BenchRun): Record<string, string> {
  const charts: Record<string, string> = {};
  const t = run.typing;

  charts["typing-latency-p95-spread.svg"] = lineChart({
    title: "Sync latency p95: edits in different places",
    xLabel: "Number of users N",
    yLabel: "ms",
    series: typingSeries(t, "spread", (r) => r.latencyMs.p95),
  });
  charts["typing-latency-p95-same.svg"] = lineChart({
    title: "Sync latency p95: everyone edits the same position",
    xLabel: "Number of users N",
    yLabel: "ms",
    series: typingSeries(t, "samePosition", (r) => r.latencyMs.p95),
  });
  charts["server-cpu.svg"] = lineChart({
    title: "Server CPU load (one core = 100%)",
    xLabel: "Number of users N",
    yLabel: "%",
    series: typingSeries(t, "spread", (r) => r.serverCpuPercent),
  });
  charts["server-memory.svg"] = lineChart({
    title: "Peak memory of the server process (RSS)",
    xLabel: "Number of users N",
    yLabel: "MB",
    series: typingSeries(t, "spread", (r) => r.serverPeakRssMb),
  });
  charts["traffic-per-edit.svg"] = lineChart({
    title: "Traffic per edit (all clients, in + out)",
    xLabel: "Number of users N",
    yLabel: "bytes",
    series: typingSeries(t, "spread", (r) => r.bytesPerEdit),
  });

  charts["offline-merge.svg"] = lineChart({
    title: "Merge time after offline work",
    xLabel: "Edits by the offline client (and as many by the others)",
    yLabel: "ms",
    series: (Object.keys(COLORS) as SystemId[]).map((system) => {
      const byK = group(
        run.offline.filter((r) => r.system === system),
        (r) => String(r.offlineEdits),
      );
      return {
        name: NAMES[system],
        color: COLORS[system],
        points: numeric([...byK.keys()]).map((x) => ({ x, y: avg(byK.get(x)!, (r) => r.mergeMs) })),
      };
    }),
  });

  for (const ratio of [...new Set(run.growth.map((r) => r.deleteRatio))].sort()) {
    const rows = run.growth.filter((r) => r.deleteRatio === ratio);
    const edits = numeric(rows.map((r) => String(r.edits)));
    const pick = (system: string, f: (r: GrowthResult) => number) =>
      edits.map((x) => {
        const row = rows.find((r) => r.system === system && String(r.edits) === x);
        return { x, y: row ? f(row) : 0 };
      });
    charts[`document-size-del${Math.round(ratio * 100)}.svg`] = lineChart({
      title: `Document size after N edits (${Math.round(ratio * 100)}% deletions)`,
      xLabel: "Number of edits",
      yLabel: "bytes (log scale)",
      logY: true,
      series: [
        { name: "Yjs: state", color: COLORS.yjs, points: pick("yjs", (r) => r.docSize.snapshotBytes) },
        {
          name: "ShareDB: snapshot",
          color: COLORS.sharedb,
          dashed: true,
          points: pick("sharedb", (r) => r.docSize.snapshotBytes),
        },
        {
          name: "ShareDB: snapshot + log",
          color: COLORS.sharedb,
          points: pick("sharedb", (r) => r.docSize.snapshotBytes + r.docSize.historyBytes),
        },
        { name: "Plain text", color: "#64748b", dashed: true, points: pick("yjs", (r) => r.textBytes) },
      ],
    });
  }

  charts["board-latency-p95.svg"] = lineChart({
    title: "Board: p95 latency when moving shapes",
    xLabel: "Number of users N",
    yLabel: "ms",
    series: (["ownShape", "sameShape"] as const).flatMap((mode) =>
      (Object.keys(COLORS) as SystemId[]).map((system) => {
        const bySize = group(
          run.board.filter((r) => r.system === system && r.mode === mode),
          (r) => String(r.clients),
        );
        return {
          name: `${NAMES[system]}, ${mode === "ownShape" ? "own shapes" : "one shape"}`,
          color: COLORS[system],
          dashed: mode === "sameShape",
          points: numeric([...bySize.keys()]).map((x) => ({ x, y: avg(bySize.get(x)!, (r) => r.latencyMs.p95) })),
        };
      }),
    ),
  });

  return charts;
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

export function buildReport(run: BenchRun): string {
  const lines: string[] = [];
  const config = run.meta.config as {
    reps?: number;
    typingDurationMs?: number;
    editsPerSecondPerClient?: number;
  };

  lines.push("# Bench results: CRDT (Yjs) vs OT (ShareDB)", "");
  lines.push(
    `Run: ${run.meta.startedAt}. Node ${run.meta.node}, ${run.meta.platform}, ${run.meta.cpu} (${run.meta.cpuCount} threads), ${run.meta.memoryGb} GB RAM. ` +
      `Repeats per point: ${config.reps ?? "?"}; typing time: ${(config.typingDurationMs ?? 0) / 1000} s; ` +
      `typing speed: ${config.editsPerSecondPerClient ?? "?"} edits/s per user.`,
    "",
  );
  lines.push(
    "The server of each system runs as a separate process (to measure its CPU and memory fairly), and the client bots run in separate processes (up to 8, with 12 clients each), so the load generator does not become the bottleneck. Latency is measured from the insert call at the author to the edit appearing at another client (the machine's shared clock). " +
      "The servers are compared without a database: Hocuspocus in memory and ShareDB with in-memory storage, so the sync algorithm itself is compared, not the storage layer.",
    "",
  );

  lines.push("## 1. Typing at the same time: latency, correctness, load", "");
  for (const [mode, title] of [
    ["spread", "Edits in different places of the file"],
    ["samePosition", "Everyone inserts at the same position (most conflicts)"],
  ] as const) {
    lines.push(`### ${title}`, "");
    const rows: string[][] = [];
    const bySize = group(
      run.typing.filter((r) => r.mode === mode),
      (r) => String(r.clients),
    );
    for (const n of numeric([...bySize.keys()])) {
      for (const system of Object.keys(COLORS) as SystemId[]) {
        const runs = bySize.get(n)!.filter((r) => r.system === system);
        if (runs.length === 0) continue;
        rows.push([
          n,
          NAMES[system],
          fmt(avg(runs, (r) => r.latencyMs.mean)),
          fmt(avg(runs, (r) => r.latencyMs.p50)),
          fmt(avg(runs, (r) => r.latencyMs.p95)),
          spread(runs, (r) => r.latencyMs.p95),
          fmt(avg(runs, (r) => r.latencyMs.p99)),
          fmt(avg(runs, (r) => r.serverCpuPercent), 0),
          fmt(avg(runs, (r) => r.serverPeakRssMb), 0),
          fmt(avg(runs, (r) => r.bytesPerEdit), 0),
          runs.every((r) => r.converged && r.allEditsPresent) ? "yes" : "NO",
          runs.every((r) => r.clientEventLoopP99Ms < RIG_LAG_LIMIT_MS) ? "yes" : "NO (rig overloaded)",
        ]);
      }
    }
    lines.push(
      table(
        ["N", "System", "mean ms", "p50", "p95", "p95, repeat range", "p99", "Server CPU, %", "RSS, MB", "bytes/edit", "Converged, nothing lost", "Rig not overloaded"],
        rows,
      ),
      "",
    );
  }
  lines.push(
    "![p95, different places](charts/typing-latency-p95-spread.svg)",
    "![p95, same position](charts/typing-latency-p95-same.svg)",
    "![CPU](charts/server-cpu.svg)",
    "![Memory](charts/server-memory.svg)",
    "![Traffic](charts/traffic-per-edit.svg)",
    "",
  );

  lines.push(
    `Measurement check: the "Rig not overloaded" column means the event loop lag (p99) in the bot processes is under ${RIG_LAG_LIMIT_MS} ms. ` +
      "If it is higher, the measured latency shows an overloaded load generator, not the server, and such a point cannot be read as a property of the algorithm. " +
      "The background value on this machine is about 20–25 ms (Windows timer granularity).",
    "",
  );

  lines.push("## 2. Offline work", "");
  const offlineRows: string[][] = [];
  const byK = group(run.offline, (r) => String(r.offlineEdits));
  for (const k of numeric([...byK.keys()])) {
    for (const system of Object.keys(COLORS) as SystemId[]) {
      const runs = byK.get(k)!.filter((r) => r.system === system);
      if (runs.length === 0) continue;
      offlineRows.push([
        k,
        NAMES[system],
        fmt(avg(runs, (r) => r.mergeMs), 0),
        spread(runs, (r) => r.mergeMs, 0),
        fmt(avg(runs, (r) => r.bytesDuringMerge / 1024), 1),
        runs.every((r) => r.converged && r.allEditsPresent) ? "yes" : "NO",
      ]);
    }
  }
  lines.push(
    "One client disconnects and makes K edits locally, while the others make another K edits; then the client comes back. The time is counted from the reconnect until everyone has the same text.",
    "",
    table(["K", "System", "Merge, ms", "Repeat range, ms", "Traffic during merge, KB", "Converged, nothing lost"], offlineRows),
    "",
    "![Merge after offline work](charts/offline-merge.svg)",
    "",
  );

  lines.push("## 3. Document size", "");
  lines.push(
    "Five clients make the given number of edits (inserting one character or deleting 1–5 characters at a random place). " +
      "\"To open\" is how many bytes a client joining the document has to receive (for Yjs the whole state, for ShareDB the snapshot). " +
      "\"Stored in total\" adds the operation log for ShareDB, from which any version can be rebuilt; Yjs has no version history but keeps tombstones for deleted content.",
    "",
  );
  for (const ratio of [...new Set(run.growth.map((r) => r.deleteRatio))].sort()) {
    const rows = run.growth.filter((r) => r.deleteRatio === ratio);
    lines.push(
      `### ${Math.round(ratio * 100)}% deletions`,
      "",
      table(
        ["Edits", "System", "To open, bytes", "Stored in total, bytes", "Total per edit, bytes", "Plain text, bytes"],
        rows.map((r) => {
          const total = r.docSize.snapshotBytes + r.docSize.historyBytes;
          return [
            String(r.edits),
            NAMES[r.system as SystemId],
            String(r.docSize.snapshotBytes),
            String(total),
            fmt(total / r.edits),
            String(r.textBytes),
          ];
        }),
      ),
      "",
      `![Document size, ${Math.round(ratio * 100)}% deletions](charts/document-size-del${Math.round(ratio * 100)}.svg)`,
      "",
    );
  }

  lines.push("## 4. Design board: moving shapes", "");
  const boardRows: string[][] = [];
  const boardGroups = group(run.board, (r) => `${r.mode}|${r.clients}`);
  const boardKeys = [...boardGroups.keys()].sort((a, b) => {
    const [modeA, sizeA] = a.split("|");
    const [modeB, sizeB] = b.split("|");
    return modeA === modeB ? Number(sizeA) - Number(sizeB) : modeA!.localeCompare(modeB!);
  });
  for (const key of boardKeys) {
    for (const system of Object.keys(COLORS) as SystemId[]) {
      const runs = boardGroups.get(key)!.filter((r) => r.system === system);
      if (runs.length === 0) continue;
      boardRows.push([
        runs[0]!.mode === "ownShape" ? "each moves their own" : "everyone moves one",
        String(runs[0]!.clients),
        NAMES[system],
        fmt(avg(runs, (r) => r.latencyMs.p50)),
        fmt(avg(runs, (r) => r.latencyMs.p95)),
        runs.every((r) => r.converged) ? "yes" : "NO",
      ]);
    }
  }
  lines.push(
    table(["Mode", "N", "System", "p50, ms", "p95, ms", "States match"], boardRows),
    "",
    "![Board](charts/board-latency-p95.svg)",
    "",
  );

  return lines.join("\n");
}
