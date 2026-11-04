import { defineConfig } from "@playwright/test";

/**
 * Measures NFR-P2 against the built site behind the host server, not the development server:
 *
 *   pnpm host:test -- --no-tunnel --no-run
 *   LOAD_TIME_URL=http://127.0.0.1:8787 npx playwright test --config load-time.config.ts
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "load-time.measure.ts",
  workers: 1,
  reporter: [["list"]],
  timeout: 300_000,
  use: { channel: "chrome" },
});
