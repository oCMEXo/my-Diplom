import * as Y from "yjs";

export function textToYjsState(text: string): Uint8Array {
  const doc = new Y.Doc();
  doc.getText("monaco").insert(0, text);
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}

export function yjsStateToText(state: Uint8Array | null): string {
  if (!state) return "";
  const doc = new Y.Doc();
  Y.applyUpdate(doc, new Uint8Array(state));
  const text = doc.getText("monaco").toString();
  doc.destroy();
  return text;
}
