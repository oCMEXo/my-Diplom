import { RUNNABLE_LANGUAGES, type RunnableLanguage } from "./constants.js";

const EXTENSION_LANGUAGES: Record<string, string> = {
  py: "python",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  yml: "yaml",
  yaml: "yaml",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  sol: "solidity",
  php: "php",
  rb: "ruby",
  kt: "kotlin",
  swift: "swift",
  dart: "dart",
  scala: "scala",
  lua: "lua",
  r: "r",
  pl: "perl",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",
  ini: "ini",
  cfg: "ini",
  xml: "xml",
  svg: "xml",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  tf: "hcl",
  ex: "elixir",
  exs: "elixir",
  fs: "fsharp",
  vb: "vb",
  clj: "clojure",
  txt: "plaintext",
};

const NAMED_FILES: Record<string, string> = { dockerfile: "dockerfile" };

const LANGUAGE_NAMES: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  markdown: "Markdown",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  sql: "SQL",
  shell: "Shell",
  yaml: "YAML",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  solidity: "Solidity",
  php: "PHP",
  ruby: "Ruby",
  kotlin: "Kotlin",
  swift: "Swift",
  dart: "Dart",
  scala: "Scala",
  lua: "Lua",
  r: "R",
  perl: "Perl",
  powershell: "PowerShell",
  bat: "Batch",
  ini: "INI",
  xml: "XML",
  graphql: "GraphQL",
  protobuf: "Protocol Buffers",
  hcl: "Terraform (HCL)",
  elixir: "Elixir",
  fsharp: "F#",
  vb: "Visual Basic",
  clojure: "Clojure",
  dockerfile: "Dockerfile",
  plaintext: "Text",
};

function fileName(path: string) {
  return path.split("/").pop() ?? path;
}

export function extensionOf(path: string): string | null {
  const name = fileName(path);
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : null;
}

export function inferLanguage(path: string): string | null {
  const named = NAMED_FILES[fileName(path).toLowerCase()];
  if (named) return named;
  const extension = extensionOf(path);
  return extension ? (EXTENSION_LANGUAGES[extension] ?? null) : null;
}

export function toRunnableLanguage(language: string | null): RunnableLanguage | null {
  return (RUNNABLE_LANGUAGES as readonly string[]).includes(language ?? "")
    ? (language as RunnableLanguage)
    : null;
}

export function languageName(language: string): string {
  return LANGUAGE_NAMES[language] ?? language;
}

export function runnableLanguageList(): string {
  const names = RUNNABLE_LANGUAGES.map(languageName);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export type LanguageSupport = "run" | "highlight" | "text";

export interface LanguageInfo {
  language: string | null;
  name: string;
  extension: string | null;
  support: LanguageSupport;
  unknown: boolean;
}

export function describeLanguage(path: string, language: string | null = inferLanguage(path)): LanguageInfo {
  const extension = extensionOf(path);
  if (!language || language === "plaintext") {
    return { language, name: "Text", extension, support: "text", unknown: !language && extension !== null };
  }
  return {
    language,
    name: languageName(language),
    extension,
    support: toRunnableLanguage(language) ? "run" : "highlight",
    unknown: false,
  };
}

export function languageCatalogue(): { language: string; name: string; extensions: string[]; support: LanguageSupport }[] {
  const byLanguage = new Map<string, string[]>();
  for (const [extension, language] of Object.entries(EXTENSION_LANGUAGES)) {
    if (language === "plaintext") continue;
    byLanguage.set(language, [...(byLanguage.get(language) ?? []), `.${extension}`]);
  }
  for (const [name, language] of Object.entries(NAMED_FILES)) {
    byLanguage.set(language, [...(byLanguage.get(language) ?? []), name === "dockerfile" ? "Dockerfile" : name]);
  }
  return [...byLanguage.entries()]
    .map(([language, extensions]) => ({
      language,
      name: languageName(language),
      extensions,
      support: (toRunnableLanguage(language) ? "run" : "highlight") as LanguageSupport,
    }))
    .sort((a, b) => (a.support === b.support ? a.name.localeCompare(b.name) : a.support === "run" ? -1 : 1));
}
