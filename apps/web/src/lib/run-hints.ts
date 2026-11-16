export function missingModule(output: string): string | null {
  const node = output.match(/Cannot find module '([^'./][^']*)'/);
  if (node) return node[1] ?? null;
  const python = output.match(/ModuleNotFoundError: No module named '([^']+)'/);
  return python?.[1] ?? null;
}

export function wantsInput(output: string): boolean {
  return /\bEOFError\b/.test(output);
}
