/** The platform's language name as the Monaco editor knows it; a few are spelled differently there. */
const MONACO_IDS: Record<string, string> = { solidity: "sol" };

export function monacoLanguage(language: string | null): string {
  if (!language) return "plaintext";
  return MONACO_IDS[language] ?? language;
}
