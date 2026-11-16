import { useEffect, useRef } from "react";
import { monacoLanguage } from "../lib/monaco-language";
import * as monaco from "monaco-editor";
import { MONACO_THEME } from "../lib/monaco-setup";
import { useTheme } from "../lib/theme";

export function VersionDiff({ original, modified, language }: { original: string; modified: string; language: string }) {
  const host = useRef<HTMLDivElement>(null);
  const models = useRef<{ original: monaco.editor.ITextModel; modified: monaco.editor.ITextModel } | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const editor = monaco.editor.createDiffEditor(host.current!, {
      readOnly: true,
      originalEditable: false,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
      lineHeight: 22,
      scrollBeyondLastLine: false,
      renderOverviewRuler: false,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    const pair = {
      original: monaco.editor.createModel("", monacoLanguage(language)),
      modified: monaco.editor.createModel("", monacoLanguage(language)),
    };
    editor.setModel(pair);
    models.current = pair;
    return () => {
      models.current = null;
      editor.dispose();
      pair.original.dispose();
      pair.modified.dispose();
    };
  }, [language]);

  useEffect(() => {
    models.current?.original.setValue(original);
  }, [original, language]);

  useEffect(() => {
    const model = models.current?.modified;
    if (model && model.getValue() !== modified) {
      model.applyEdits([{ range: model.getFullModelRange(), text: modified }]);
    }
  }, [modified, language]);

  useEffect(() => {
    monaco.editor.setTheme(MONACO_THEME[theme]);
  }, [theme]);

  return <div ref={host} className="h-full w-full" />;
}
