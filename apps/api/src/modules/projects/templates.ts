import { inferLanguage, type FileType, type ProjectTemplate } from "@collab/shared";
import { textToYjsState } from "../../lib/yjs-text.js";

interface TemplateFile {
  path: string;
  type: FileType;
  text: string;
}

const readme = (mainFile: string) => `# С чего начать

1. Откройте \`${mainFile}\` и нажмите **Запустить**: вывод увидят все участники.
2. Позовите коллегу: меню проекта → **Пригласить** → скопируйте ссылку. Регистрация ему не нужна.
3. Правьте файл вместе: курсоры и изменения видны сразу у каждого.

Это документ Markdown: слева текст, справа видно, как он выглядит. Его можно править так же, как код.
`;

const TEMPLATES: Record<ProjectTemplate, TemplateFile[]> = {
  python: [
    { path: "README.md", type: "doc", text: readme("main.py") },
    {
      path: "main.py",
      type: "code",
      text: `# Пример: числа Фибоначчи. Нажмите «Запустить» вверху справа.
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
      text: `// Пример: числа Фибоначчи. Нажмите «Запустить» вверху справа.
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

/** The files a new project starts with when it is made from an example, ready to be stored. */
export function templateFiles(template: ProjectTemplate) {
  return TEMPLATES[template].map((file) => ({
    path: file.path,
    type: file.type,
    language: file.type === "doc" ? "markdown" : inferLanguage(file.path),
    yjsState: Buffer.from(textToYjsState(file.text)),
  }));
}
