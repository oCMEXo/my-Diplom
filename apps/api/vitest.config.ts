import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup-env.ts"],
    // Most tests talk to a real database; when every package tests at once, the first query of a file
    // can take several seconds just to start the database engine.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
