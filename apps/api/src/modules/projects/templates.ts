import { inferLanguage, type FileType, type ProjectTemplate } from "@collab/shared";
import { textToYjsState } from "../../lib/yjs-text.js";

interface TemplateFile {
  path: string;
  type: FileType;
  text: string;
}

const readme = (mainFile: string) => `# Getting started

1. Open \`${mainFile}\` and press **Run**. Everyone in the project sees the output.
2. Invite a teammate: project menu → **Invite people** → copy the link. They do not need an account.
3. Edit the file together. Everyone sees cursors and changes at once.

This is a Markdown document: the text is on the left, and the right side shows how it looks. You can edit it like code.
`;

const TEMPLATES: Record<ProjectTemplate, TemplateFile[]> = {
  python: [
    { path: "README.md", type: "doc", text: readme("main.py") },
    {
      path: "main.py",
      type: "code",
      text: `# Example: Fibonacci numbers. Press Run at the top right.
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


print([fib(i) for i in range(10)])
`,
    },
  ],
  javascript: [
    { path: "README.md", type: "doc", text: readme("main.js") },
    {
      path: "main.js",
      type: "code",
      text: `// Example: Fibonacci numbers. Press Run at the top right.
function fib(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i += 1) [a, b] = [b, a + b];
  return a;
}

console.log(Array.from({ length: 10 }, (_, i) => fib(i)));
`,
    },
  ],
};

export function templateFiles(template: ProjectTemplate) {
  return TEMPLATES[template].map((file) => ({
    path: file.path,
    type: file.type,
    language: file.type === "doc" ? "markdown" : inferLanguage(file.path),
    yjsState: Buffer.from(textToYjsState(file.text)),
  }));
}
