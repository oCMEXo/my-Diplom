import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

export const MONACO_THEME = { dark: "collab-dark", light: "collab-light" } as const;

monaco.editor.defineTheme(MONACO_THEME.dark, {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "9aa1ad", fontStyle: "italic" },
    { token: "keyword", foreground: "b9a8ff" },
    { token: "string", foreground: "7ee3b0" },
    { token: "number", foreground: "ffb86b" },
    { token: "type", foreground: "7cc4ff" },
    { token: "delimiter", foreground: "b5bac1" },
  ],
  colors: {
    "editor.background": "#313338",
    "editor.foreground": "#dbdee1",
    "editorLineNumber.foreground": "#80848e",
    "editorLineNumber.activeForeground": "#dbdee1",
    "editor.lineHighlightBackground": "#383a40",
    "editor.lineHighlightBorder": "#383a40",
    "editor.selectionBackground": "#5865f266",
    "editorCursor.foreground": "#dbdee1",
    "editorIndentGuide.background1": "#3f4147",
    "editorIndentGuide.activeBackground1": "#5c5e66",
    "editorWidget.background": "#2b2d31",
    "editorSuggestWidget.background": "#2b2d31",
    "scrollbarSlider.background": "#1e1f2299",
  },
});

monaco.editor.defineTheme(MONACO_THEME.light, {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "5c5e66", fontStyle: "italic" },
    { token: "keyword", foreground: "4752c4" },
    { token: "string", foreground: "0f9d6b" },
    { token: "number", foreground: "d97706" },
    { token: "type", foreground: "0b7bd6" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#313338",
    "editorLineNumber.foreground": "#80848e",
    "editorLineNumber.activeForeground": "#313338",
    "editor.lineHighlightBackground": "#f2f3f5",
    "editor.lineHighlightBorder": "#f2f3f5",
    "editor.selectionBackground": "#5865f233",
    "editorCursor.foreground": "#313338",
  },
});
