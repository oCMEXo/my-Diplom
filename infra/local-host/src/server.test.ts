import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import { compressWebRoot } from "./compress.js";
import { createHostServer } from "./server.js";

const listen = (server: http.Server) =>
  new Promise<number>((resolve) => server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)));

const close = (server: http.Server) => new Promise<void>((resolve) => server.close(() => resolve()));

describe("host server", () => {
  let webRoot: string;
  let api: http.Server;
  let collab: http.Server;
let terminal: http.Server;
  let host: http.Server;
  let hostPort: number;
  const seen: { url?: string; forwardedFor?: string | string[]; body?: string } = {};

  beforeAll(async () => {
    webRoot = fs.mkdtempSync(path.join(os.tmpdir(), "collab-host-"));
    fs.mkdirSync(path.join(webRoot, "assets"));
    fs.writeFileSync(path.join(webRoot, "index.html"), "<!doctype html><title>app</title>");
    fs.writeFileSync(path.join(webRoot, "sw.js"), "// service worker");
    fs.writeFileSync(path.join(webRoot, "assets", "app-abc123.js"), "console.log(1)");
    fs.writeFileSync(path.join(webRoot, "assets", "big-abc123.js"), "console.log(1);\n".repeat(2000));
    await compressWebRoot(webRoot);

    api = http.createServer((request, response) => {
      seen.url = request.url;
      seen.forwardedFor = request.headers["x-forwarded-for"];
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        seen.body = body;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ status: "ok" }));
      });
    });

    collab = http.createServer();
    const sockets = new WebSocketServer({ server: collab });
    sockets.on("connection", (socket) => socket.on("message", (data) => socket.send(`echo:${data}`)));

    terminal = http.createServer();
    new WebSocketServer({ server: terminal }).on("connection", (socket, request) => socket.send(`terminal:${request.url}`));

    const apiPort = await listen(api);
    const collabPort = await listen(collab);
    const terminalPort = await listen(terminal);
    host = createHostServer({
      webRoot,
      apiTarget: `http://127.0.0.1:${apiPort}`,
      collabTarget: `http://127.0.0.1:${collabPort}`,
      terminalTarget: `http://127.0.0.1:${terminalPort}`,
    });
    hostPort = await listen(host);
  });

  afterAll(async () => {
    await Promise.all([close(host), close(api), close(collab), close(terminal)]);
    fs.rmSync(webRoot, { recursive: true, force: true });
  });

  const get = (urlPath: string, init?: RequestInit) => fetch(`http://127.0.0.1:${hostPort}${urlPath}`, init);

  it("serves the web app and falls back to it for client-side routes", async () => {
    const home = await get("/");
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("<title>app</title>");

    const deepLink = await get("/projects/1234/files/5678");
    expect(deepLink.status).toBe(200);
    expect(await deepLink.text()).toContain("<title>app</title>");
  });

  it("caches hashed assets for a year but never the app shell or the service worker", async () => {
    expect((await get("/assets/app-abc123.js")).headers.get("cache-control")).toContain("immutable");
    expect((await get("/")).headers.get("cache-control")).toBe("no-cache");
    expect((await get("/sw.js")).headers.get("cache-control")).toBe("no-cache");
  });

  it("sends large text files compressed to browsers that accept it, and whole to the others", async () => {
    const ask = (encoding: string) =>
      new Promise<http.IncomingMessage & { size: number }>((resolve) => {
        http.get(
          { port: hostPort, host: "127.0.0.1", path: "/assets/big-abc123.js", headers: { "Accept-Encoding": encoding } },
          (response) => {
            let size = 0;
            response.on("data", (chunk: Buffer) => (size += chunk.length));
            response.on("end", () => resolve(Object.assign(response, { size })));
          },
        );
      });

    const brotli = await ask("br, gzip");
    expect(brotli.headers["content-encoding"]).toBe("br");
    expect(brotli.size).toBeLessThan(1000);
    expect(brotli.headers["cache-control"]).toContain("immutable");

    expect((await ask("gzip")).headers["content-encoding"]).toBe("gzip");

    const plain = await ask("identity");
    expect(plain.headers["content-encoding"]).toBeUndefined();
    expect(plain.size).toBe("console.log(1);\n".length * 2000);
  });

  it("does not compress what is too small to gain from it", () => {
    expect(fs.existsSync(path.join(webRoot, "assets", "app-abc123.js.br"))).toBe(false);
  });

  it("sends the robots of messengers to the preview page of the API, and people to the app", async () => {
    const robot = { headers: { "User-Agent": "TelegramBot (like TwitterBot)" } };

    await get("/join/abc123", robot);
    expect(seen.url).toBe("/preview/join/abc123");
    await get("/?from=chat", robot);
    expect(seen.url).toBe("/preview/");

    seen.url = undefined;
    const person = await get("/join/abc123", { headers: { "User-Agent": "Mozilla/5.0" } });
    expect(await person.text()).toContain("<title>app</title>");
    // Only pages that have a preview go to the API: a robot asking for a file gets the file.
    const file = await get("/assets/app-abc123.js", robot);
    expect(await file.text()).toBe("console.log(1)");
    expect(seen.url).toBeUndefined();
  });

  it("sends basic security headers", async () => {
    const response = await get("/");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("forwards /api to the API without the prefix, with the body and the client address", async () => {
    const response = await get("/api/auth/login?x=1", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await response.json()).toEqual({ status: "ok" });
    expect(seen.url).toBe("/auth/login?x=1");
    expect(seen.body).toBe('{"a":1}');
    expect(seen.forwardedFor).toContain("127.0.0.1");
  });

  it("ignores an address forged by the visitor and uses the one the tunnel reports", async () => {
    await get("/api/ping", { headers: { "X-Forwarded-For": "1.2.3.4" } });
    expect(String(seen.forwardedFor)).not.toContain("1.2.3.4");

    await get("/api/ping", { headers: { "X-Forwarded-For": "1.2.3.4", "CF-Connecting-IP": "5.6.7.8" } });
    expect(String(seen.forwardedFor).split(",")[0]).toBe("5.6.7.8");
    expect(String(seen.forwardedFor)).not.toContain("1.2.3.4");
  });

  it("does not mistake a similar-looking path for the API", async () => {
    const response = await get("/apiary");
    expect(await response.text()).toContain("<title>app</title>");
  });

  it("carries WebSocket traffic to the sync server under /collab", async () => {
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${hostPort}/collab`);
      socket.on("open", () => socket.send("hello"));
      socket.on("message", (data) => {
        resolve(String(data));
        socket.close();
      });
      socket.on("error", reject);
    });
    expect(reply).toBe("echo:hello");
  });

  it("carries terminals to the runner under /terminal, with the ticket in the query", async () => {
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${hostPort}/terminal?ticket=abc&cols=80`);
      socket.on("message", (data) => {
        resolve(String(data));
        socket.close();
      });
      socket.on("error", reject);
    });
    expect(reply).toBe("terminal:/?ticket=abc&cols=80");
  });

  it("refuses WebSocket connections to anything else", async () => {
    const outcome = await new Promise<string>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${hostPort}/somewhere-else`);
      socket.on("open", () => resolve("opened"));
      socket.on("error", () => resolve("refused"));
    });
    expect(outcome).toBe("refused");
  });

  it("answers 502 in plain words when the API is down", async () => {
    const lonely = createHostServer({ webRoot, apiTarget: "http://127.0.0.1:9", collabTarget: "http://127.0.0.1:9" });
    const port = await listen(lonely);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(response.status).toBe(502);
      expect(((await response.json()) as { message: string }).message).toMatch(/not available/);
    } finally {
      await close(lonely);
    }
  });
});
