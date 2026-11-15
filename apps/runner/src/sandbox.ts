import { RUN_TIMEOUT_MS } from "@collab/shared";
import type { RunnableLanguage } from "@collab/shared";
import { TERMINAL_IMAGE } from "./terminal/image.js";

interface Limits {
  memory: string;
  cpus: string;
  pids: string;
  tmpfsSize: string;
}

interface LanguageSpec {
  image: string;
  /** Runs in the project folder; the entry file's path is in $ENTRY, never pasted into the script. */
  command: string;
  defaultEntry: string;
  /** Finds the failing line of the entry file in the error output. */
  errorLinePattern: (file: string) => RegExp;
  pick: "first" | "last";
  limits?: Partial<Limits>;
  /** A compiled program is written to /tmp and has to be allowed to run from there. */
  execTmp?: boolean;
}

/** Where the project is unpacked inside the container (a tmpfs). */
export const WORKDIR = "/tmp/p";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const baseName = (file: string) => file.slice(file.lastIndexOf("/") + 1);

/** gcc and g++ print "./main.c:5:3: error: …"; a crash at run time has no line. */
const compilerError = (file: string) => new RegExp(`(?:\\./)?${escapeRegExp(file)}:(\\d+):\\d+: (?:fatal )?error`, "g");

export const LANGUAGES: Record<RunnableLanguage, LanguageSpec> = {
  javascript: {
    image: "node:22-alpine",
    command: 'node "./$ENTRY"',
    defaultEntry: "main.js",
    errorLinePattern: (file) => new RegExp(`${escapeRegExp(WORKDIR)}/(?:\\./)?${escapeRegExp(file)}:(\\d+)`, "g"),
    pick: "first",
  },
  python: {
    image: "python:3.12-alpine",
    command: 'python "./$ENTRY"',
    defaultEntry: "main.py",
    errorLinePattern: (file) =>
      new RegExp(`File "${escapeRegExp(WORKDIR)}/(?:\\./)?${escapeRegExp(file)}", line (\\d+)`, "g"),
    pick: "last",
  },
  c: {
    image: TERMINAL_IMAGE,
    command: `sh -c 'gcc -std=c17 -O1 -o /tmp/program "./$ENTRY" -lm && exec /tmp/program'`,
    defaultEntry: "main.c",
    errorLinePattern: compilerError,
    pick: "first",
    limits: { memory: "256m", cpus: "1" },
    execTmp: true,
  },
  cpp: {
    image: TERMINAL_IMAGE,
    command: `sh -c 'g++ -std=c++20 -O1 -o /tmp/program "./$ENTRY" && exec /tmp/program'`,
    defaultEntry: "main.cpp",
    errorLinePattern: compilerError,
    pick: "first",
    limits: { memory: "384m", cpus: "1" },
    execTmp: true,
  },
  java: {
    image: TERMINAL_IMAGE,
    // The source launcher compiles in memory; a small heap and one compiler tier start the JVM faster.
    command: 'java -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:-UsePerfData -Xss512k -Xmx128m "./$ENTRY"',
    defaultEntry: "Main.java",
    // Compile errors say "./Main.java:5: error", a stack trace says "(Main.java:5)".
    errorLinePattern: (file) => new RegExp(`${escapeRegExp(baseName(file))}:(\\d+)`, "g"),
    pick: "first",
    limits: { memory: "384m", cpus: "1", pids: "128" },
  },
};

export const SANDBOX_LIMITS: Limits = {
  memory: "128m",
  cpus: "0.5",
  pids: "64",
  tmpfsSize: "16m",
};

/** A second time limit inside the container, a bit later than the runner's, in case the runner crashes. */
export const SELF_STOP_SECONDS = Math.ceil(RUN_TIMEOUT_MS / 1000) + 5;

export function containerName(runId: string) {
  return `collab-run-${runId}`;
}

export function entryFile(language: RunnableLanguage, entry?: string) {
  return entry || LANGUAGES[language].defaultEntry;
}

export interface SandboxOptions {
  /** A Docker runtime such as "runsc" (gVisor): the program then talks to a user-space kernel, not the host's. */
  runtime?: string;
}

export function buildDockerArgs(
  language: RunnableLanguage,
  runId: string,
  entry?: string,
  options: SandboxOptions = {},
): string[] {
  const spec = LANGUAGES[language];
  const limits = { ...SANDBOX_LIMITS, ...spec.limits };
  // The "./" keeps a name starting with "-" from being read as an option.
  const script = `mkdir -p ${WORKDIR} && tar -xf - -C ${WORKDIR} && cd ${WORKDIR} && exec timeout -s KILL ${SELF_STOP_SECONDS} ${spec.command}`;
  return [
    "run",
    "--rm",
    "-i",
    "--name",
    containerName(runId),
    ...(options.runtime ? ["--runtime", options.runtime] : []),
    // A process with PID 1 ignores even SIGKILL from inside the container, so `timeout` could not stop it.
    "--init",
    "--network",
    "none",
    "--read-only",
    "--tmpfs",
    `/tmp:rw,${spec.execTmp ? "exec," : ""}size=${limits.tmpfsSize}`,
    "--user",
    "65534:65534",
    "--memory",
    limits.memory,
    "--memory-swap",
    limits.memory,
    "--cpus",
    limits.cpus,
    "--pids-limit",
    limits.pids,
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--env",
    "HOME=/tmp",
    "--env",
    "PYTHONDONTWRITEBYTECODE=1",
    "--env",
    `ENTRY=${entryFile(language, entry)}`,
    spec.image,
    "sh",
    "-c",
    script,
  ];
}

export function parseErrorLine(language: RunnableLanguage, stderr: string, entry?: string): number | null {
  const spec = LANGUAGES[language];
  const matches = [...stderr.matchAll(spec.errorLinePattern(entryFile(language, entry)))];
  if (matches.length === 0) return null;
  const match = spec.pick === "first" ? matches[0]! : matches[matches.length - 1]!;
  const line = Number(match[1]);
  return Number.isInteger(line) && line > 0 ? line : null;
}
