const CODE_KEY = "collab.runCode";

export const runCode = {
  get(): string | null {
    try {
      return localStorage.getItem(CODE_KEY);
    } catch {
      return null;
    }
  },
  set(code: string) {
    try {
      localStorage.setItem(CODE_KEY, code);
    } catch {
      memory = code;
    }
  },
  clear() {
    memory = null;
    try {
      localStorage.removeItem(CODE_KEY);
    } catch {
    }
  },
};
let memory: string | null = null;

export function currentRunCode() {
  return runCode.get() ?? memory;
}
