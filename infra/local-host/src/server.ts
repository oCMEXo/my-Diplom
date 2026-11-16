import http from "node:http";
import httpProxy from "http-proxy";
import sirv from "sirv";

export interface HostOptions {
  webRoot: string;
  apiTarget: string;
  collabTarget: string;
  terminalTarget?: string;
}

const PREFIXES = [
  { prefix: "/api", key: "apiTarget" },
  { prefix: "/collab", key: "collabTarget" },
  { prefix: "/terminal", key: "terminalTarget" },
] as const;

function setClientAddress(request: http.IncomingMessage) {
  const real = request.headers["cf-connecting-ip"];
  if (typeof real === "string" && real) request.headers["x-forwarded-for"] = real;
  else delete request.headers["x-forwarded-for"];
}

function match(url: string, prefix: string) {
  return url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`);
}

function route(url: string, options: HostOptions) {
  for (const { prefix, key } of PREFIXES) {
    const target = options[key];
    if (target && match(url, prefix)) return { target, rest: url.slice(prefix.length) || "/" };
  }
  return null;
}

const NO_CACHE = new Set(["/", "/index.html", "/sw.js", "/manifest.webmanifest", "/registerSW.js"]);

const PREVIEW_ROBOTS = /telegrambot|whatsapp|facebookexternalhit|twitterbot|slackbot|discordbot|vkshare|linkedinbot|viber|skypeuripreview/i;

function previewPath(request: http.IncomingMessage) {
  const url = request.url ?? "/";
  const path = url.split("?")[0]!;
  if (request.method !== "GET" || !PREVIEW_ROBOTS.test(request.headers["user-agent"] ?? "")) return null;
  return path === "/" || path.startsWith("/join/") ? `/preview${path}` : null;
}

export function createHostServer(options: HostOptions) {
  const proxy = httpProxy.createProxyServer({ xfwd: true, ws: true });

  proxy.on("error", (_error, _request, response) => {
    if (response instanceof http.ServerResponse) {
      if (!response.headersSent) {
        response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      }
      response.end(JSON.stringify({ message: "The server is not available right now. Please try again in a minute." }));
    } else {
      response.destroy();
    }
  });

  const web = sirv(options.webRoot, {
    single: true,
    etag: true,
    gzip: true,
    brotli: true,
    setHeaders(response, pathname) {
      response.setHeader(
        "Cache-Control",
        NO_CACHE.has(pathname) ? "no-cache" : "public, max-age=31536000, immutable",
      );
    },
  });

  const server = http.createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader("X-Frame-Options", "DENY");

    const routed = route(request.url ?? "/", options);
    if (routed) {
      request.url = routed.rest;
      setClientAddress(request);
      proxy.web(request, response, { target: routed.target });
      return;
    }
    const preview = previewPath(request);
    if (preview) {
      request.url = preview;
      setClientAddress(request);
      proxy.web(request, response, { target: options.apiTarget });
      return;
    }
    web(request, response, () => {
      response.statusCode = 404;
      response.end();
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const routed = route(request.url ?? "/", options);
    if (!routed) {
      socket.destroy();
      return;
    }
    request.url = routed.rest;
    setClientAddress(request);
    proxy.ws(request, socket, head, { target: routed.target });
  });

  server.on("close", () => proxy.close());
  return server;
}
