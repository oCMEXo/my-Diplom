const MONACO_IDS: Record<string, string> = { solidity: "sol" };

export function monacoLanguage(language: string | null): string {
  if (!language) return "plaintext";
  return MONACO_IDS[language] ?? language;
}
