import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { terminalClientMessageSchema } from "@collab/shared";
import type { TerminalServerMessage, TerminalTicketData } from "@collab/shared";
import { createOutputGate } from "./output-gate.js";
import type { TerminalSession, TerminalSessionOptions } from "./session.js";

export interface TerminalServerOptions {
  takeTicket: (ticket: string) => Promise<TerminalTicketData | null>;
  openSession: (options: TerminalSessionOptions) => Promise<TerminalSession>;
  maxMs: number;
  maxPerUser: number;
  maxTotal: number;
  heartbeatMs?: number;
}

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

export function createTerminalServer(options: TerminalServerOptions) {
  const server = http.createServer((_request, response) => {
    response.writeHead(426, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The terminal works over WebSocket.");
  });
  const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
  const perUser = new Map<string, number>();
  let total = 0;
  const open = new Set<{ socket: WebSocket; userId: string; projectId: string }>();

  wss.on("connection", async (socket: WebSocket & { alive?: boolean }, request) => {
    const send = (message: TerminalServerMessage) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    };
    const end = (message: string) => {
      send({ type: "exit", message });
      socket.close(1000);
    };
    socket.alive = true;
    socket.on("pong", () => (socket.alive = true));

    let gone = false;
    let session: TerminalSession | null = null;
    let release = () => {};
    socket.on("close", () => {
      gone = true;
      session?.close();
      release();
    });

    const url = new URL(request.url ?? "/", "http://terminal");
    const ticket = url.searchParams.get("ticket") ?? "";
    const data = ticket ? await options.takeTicket(ticket).catch(() => null) : null;
    if (gone) return;
    if (!data) return end("The terminal link has expired. Open the terminal again.");
    if ((perUser.get(data.userId) ?? 0) >= options.maxPerUser) {
      return end(`Too many terminals are open (at most ${options.maxPerUser}). Close the ones you do not need.`);
    }
    if (total >= options.maxTotal) return end("The server is busy with other terminals. Please try again in a minute.");

    perUser.set(data.userId, (perUser.get(data.userId) ?? 0) + 1);
    total += 1;
    let released = false;
    release = () => {
      if (released) return;
      released = true;
      total -= 1;
      const left = (perUser.get(data.userId) ?? 1) - 1;
      if (left > 0) perUser.set(data.userId, left);
      else perUser.delete(data.userId);
    };
    const owner = { socket, userId: data.userId, projectId: data.projectId };
    open.add(owner);
    socket.on("close", () => open.delete(owner));

    const early: string[] = [];
    socket.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(raw));
      } catch {
        return;
      }
      const message = terminalClientMessageSchema.safeParse(parsed);
      if (!message.success) return;
      if (message.data.type === "input") {
        if (session) session.write(message.data.data);
        else early.push(message.data.data);
      } else {
        session?.resize(message.data.cols, message.data.rows);
      }
    });
    send({ type: "status", message: "Starting the sandbox…" });
    const gate = createOutputGate({
      buffered: () => socket.bufferedAmount,
      pause: () => session?.pause(),
      resume: () => session?.resume(),
    });
    socket.on("close", () => gate.stop());
    try {
      const opened = await options.openSession({
        files: data.files,
        userName: data.userName,
        cols: clamp(Number(url.searchParams.get("cols")), 2, 500, 80),
        rows: clamp(Number(url.searchParams.get("rows")), 2, 300, 24),
        maxMs: options.maxMs,
        onOutput: (chunk) => {
          send({ type: "output", data: chunk });
          gate.check();
        },
        onExit: (message) => end(message),
      });
      if (gone) return opened.close();
      session = opened;
      send({ type: "ready" });
      for (const input of early.splice(0)) opened.write(input);
    } catch (error) {
      console.error("terminal failed to start:", error instanceof Error ? error.message : error);
      release();
      end("Could not start the sandbox. Check that Docker is running and try again.");
    }
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients as Set<WebSocket & { alive?: boolean }>) {
      if (!socket.alive) {
        socket.terminate();
        continue;
      }
      socket.alive = false;
      socket.ping();
    }
  }, options.heartbeatMs ?? 30_000);
  heartbeat.unref();

  server.on("close", () => {
    clearInterval(heartbeat);
    for (const socket of wss.clients) socket.terminate();
    wss.close();
  });

  const closeFor = (projectId: string, userId?: string) => {
    for (const entry of open) {
      if (entry.projectId !== projectId || (userId && entry.userId !== userId)) continue;
      const message: TerminalServerMessage = { type: "exit", message: "Your access to the project changed, so the terminal was closed." };
      if (entry.socket.readyState === entry.socket.OPEN) entry.socket.send(JSON.stringify(message));
      entry.socket.close(1000);
    }
  };
  return Object.assign(server, { closeFor });
}
