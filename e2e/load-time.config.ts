import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "load-time.measure.ts",
  workers: 1,
  reporter: [["list"]],
  timeout: 300_000,
  use: { channel: "chrome" },
});
