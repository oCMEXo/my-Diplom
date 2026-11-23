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

describe("API reference pages", () => {
  it("point Swagger UI and Redoc at the server they are opened on", async () => {
    const app = await buildApp({ pathPrefix: "/api" });
    try {
      const spec = await app.inject({ method: "GET", url: "/docs/json" });
      expect(spec.json().servers).toEqual([{ url: "/api", description: "This server" }]);
      expect(spec.json().paths["/projects"].post.summary).toBe("Create a project");
      const reference = await app.inject({ method: "GET", url: "/docs/reference" });
      expect(reference.statusCode).toBe(200);
      expect(reference.headers["content-type"]).toContain("text/html");
      expect(reference.body).toContain('spec-url="/api/docs/json"');
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
