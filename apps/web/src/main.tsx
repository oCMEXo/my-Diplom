import "./lib/monaco-setup";
import { registerSW } from "virtual:pwa-register";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { reportUncaughtErrors } from "./lib/report-error";

registerSW({ immediate: true });
reportUncaughtErrors();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
