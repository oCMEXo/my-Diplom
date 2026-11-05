import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("GET /docs", () => {
  it("asks for its files under the path a proxy mounts the API at", async () => {
    const app = await buildApp({ pathPrefix: "/api" });
    try {
      const page = await app.inject({ method: "GET", url: "/docs" });
      expect(page.statusCode).toBe(200);
      expect(page.body).toContain('href="/api/docs/static/swagger-ui.css"');
      expect(page.body).not.toContain('href="/docs/static/');
    } finally {
      await app.close();
    }
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok" });
    } finally {
      await app.close();
    }
  });
});
