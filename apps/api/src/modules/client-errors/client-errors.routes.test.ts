import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

describe("health and client errors", () => {
  it("is ready when the database and Redis answer", async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({ method: "GET", url: "/health/ready" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok", database: "ok", redis: "ok" });
    } finally {
      await app.close();
    }
  });

  it("logs a browser error without the query string of the page", async () => {
    const app = await buildApp();
    const logged: unknown[] = [];
    app.addHook("onRequest", async (request) => {
      const warn = request.log.warn.bind(request.log);
      request.log.warn = ((object: unknown, ...rest: unknown[]) => {
        logged.push(object);
        return (warn as (...args: unknown[]) => void)(object, ...rest);
      }) as typeof request.log.warn;
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/client-errors",
        payload: { message: "x is undefined", url: "https://site.test/reset-password?token=secret-token-value" },
      });
      expect(response.statusCode).toBe(204);
      expect(JSON.stringify(logged)).toContain("/reset-password");
      expect(JSON.stringify(logged)).not.toContain("secret-token-value");

      const tooLong = await app.inject({ method: "POST", url: "/client-errors", payload: { message: "a".repeat(501) } });
      expect(tooLong.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
