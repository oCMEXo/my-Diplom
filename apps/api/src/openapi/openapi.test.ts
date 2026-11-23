import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { buildSpec, SPEC_DIR, specFiles } from "./export.js";
import { operationKey } from "./document.js";
import { operations } from "./operations.js";

type Json = Record<string, any>;

let spec: Json;
const all: { key: string; method: string; path: string; operation: Json }[] = [];

beforeAll(async () => {
  spec = await buildSpec();
  for (const [route, item] of Object.entries<Json>(spec.paths)) {
    for (const [method, operation] of Object.entries<Json>(item)) {
      all.push({ key: operationKey(method, route), method, path: route, operation });
    }
  }
});

function hasExample(media: Json | undefined) {
  return Boolean(media && (media.example !== undefined || (media.examples && Object.keys(media.examples).length > 0)));
}

describe("OpenAPI document", () => {
  it("documents every endpoint, and only endpoints that exist", () => {
    const keys = all.map((entry) => entry.key);
    expect(keys.length).toBeGreaterThan(60);
    expect(keys.filter((key) => !operations[key])).toEqual([]);
    expect(Object.keys(operations).filter((key) => !keys.includes(key))).toEqual([]);
  });

  it("gives every endpoint a summary, a description, a tag and a unique operationId", () => {
    const ids = new Set<string>();
    for (const { key, operation } of all) {
      expect(operation.summary, key).toBeTruthy();
      expect(operation.description, key).toBeTruthy();
      expect(operation.tags?.length, key).toBeGreaterThan(0);
      expect(ids.has(operation.operationId), key).toBe(false);
      ids.add(operation.operationId);
    }
  });

  it("has an example for every request body and every JSON response", () => {
    const missing: string[] = [];
    for (const { key, operation } of all) {
      const body = operation.requestBody?.content?.["application/json"];
      if (body && !hasExample(body)) missing.push(`${key} request`);
      for (const [code, response] of Object.entries<Json>(operation.responses)) {
        if (response.$ref) continue;
        const media = response.content?.["application/json"];
        if (media && !hasExample(media)) missing.push(`${key} ${code}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("lists 429 and 500 everywhere, 401 for endpoints that need a token, 400 for endpoints with input", () => {
    for (const { key, operation } of all) {
      expect(operation.responses["429"], key).toBeDefined();
      expect(operation.responses["500"], key).toBeDefined();
      const secured = (operation.security ?? []).length > 0;
      if (secured) expect(operation.responses["401"], key).toBeDefined();
      const input = Boolean(operation.requestBody) || (operation.parameters ?? []).some((p: Json) => p.in !== "header");
      if (input) expect(operation.responses["400"], key).toBeDefined();
    }
  });

  it("is saved in docs/api and up to date (run pnpm api:docs after changing the API)", () => {
    const files = specFiles(spec);
    for (const [name, content] of Object.entries(files)) {
      const saved = readFileSync(path.join(SPEC_DIR, name), "utf8").replace(/\r\n/g, "\n");
      expect(saved === content, `docs/api/${name} is out of date`).toBe(true);
    }
  });
});

describe("endpoints marked as secured", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ runEnabled: true, rateLimit: { perMinute: 0, authPerMinute: 0 } });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answer 401 without a token", async () => {
    const wrong: string[] = [];
    for (const { key, method, path: route, operation } of all) {
      if ((operation.security ?? []).length === 0) continue;
      const url = route.replace(/\{[^}]+\}/g, (name) => (/Id\}$/.test(name) ? "3f6c2a1e-8b4d-4c7a-9e21-5d0b7f3a9c10" : "k7Qm2xVp9LrT"));
      const query = (operation.parameters ?? []).filter((p: Json) => p.in === "query" && p.required).map((p: Json) => `${p.name}=main`);
      const response = await app.inject({
        method: method.toUpperCase() as "GET",
        url: query.length ? `${url}?${query.join("&")}` : url,
        payload: operation.requestBody?.content?.["application/json"]?.example,
      });
      if (response.statusCode !== 401) wrong.push(`${key} -> ${response.statusCode}`);
    }
    expect(wrong).toEqual([]);
  });
});
