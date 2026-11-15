import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { previewInvite } from "../projects/projects.service.js";

const SITE_NAME = "Collab";
const DEFAULT_CARD = {
  title: "Collab: work on a project together",
  description: "One shared place for code, documents and boards, in real time. Join by a link, even without an account.",
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);

const firstValue = (header: string | string[] | undefined) =>
  (Array.isArray(header) ? header[0] : header)?.split(",")[0]?.trim();

/** The address people see the site at: behind a proxy it is in the forwarded headers. */
function siteOrigin(request: FastifyRequest, trustProxy: boolean) {
  const host = (trustProxy && firstValue(request.headers["x-forwarded-host"])) || firstValue(request.headers.host) || "";
  const protocol = (trustProxy && firstValue(request.headers["x-forwarded-proto"])) || request.protocol;
  // The value ends up in the page, so only what a host name can contain is let through.
  const safeHost = /^[\w.\-:[\]]{1,255}$/.test(host) ? host : "localhost";
  return `${protocol === "https" ? "https" : "http"}://${safeHost}`;
}

function page(card: { title: string; description: string }, url: string, image: string) {
  const title = escapeHtml(card.title);
  const description = escapeHtml(card.description);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<p><a href="${escapeHtml(url)}">Open</a></p>
</body>
</html>
`;
}

/**
 * Link previews. A messenger builds the preview of a link from the page's HTML and does not run the
 * web app, so the proxy sends the robots of messengers here (infra/gcp/Caddyfile, infra/local-host).
 * An invitation link gets the same words as the invitation page: who invites and to which project.
 */
export const previewRoutes: FastifyPluginAsync<{ trustProxy: boolean }> = async (app, { trustProxy }) => {
  app.get("/preview/*", { schema: { hide: true } }, async (request, reply) => {
    const origin = siteOrigin(request, trustProxy);
    const path = `/${(request.params as { "*": string })["*"]}`;
    const code = path.match(/^\/join\/([\w-]{1,64})\/?$/)?.[1];

    let card = DEFAULT_CARD;
    let url = `${origin}/`;
    if (code) {
      const invite = await previewInvite(code).catch(() => null);
      if (invite) {
        url = `${origin}/join/${code}`;
        card = {
          title: `${invite.ownerName} invites you to the project “${invite.projectName}”`,
          description:
            invite.role === "editor"
              ? "Open the link, enter your name and edit together. No account needed."
              : "Open the link and enter your name to view the project. No account needed.",
        };
      }
    }

    return reply
      .header("Cache-Control", "no-store")
      .type("text/html; charset=utf-8")
      .send(page(card, url, `${origin}/og.png`));
  });
};
