import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@collab/db";
import { buildApp } from "../../app.js";
import { createProject, updateInviteRole } from "../projects/projects.service.js";

describe("GET /preview/*", () => {
  let app: FastifyInstance;
  let ownerId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ trustProxy: true });
    const owner = await prisma.user.create({
      data: { email: `${randomUUID()}@test.local`, name: "Аня <b>", passwordHash: "not-a-real-hash" },
    });
    ownerId = owner.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.user.delete({ where: { id: ownerId } });
  });

  const preview = (path: string, headers: Record<string, string> = {}) =>
    app.inject({ method: "GET", url: `/preview${path}`, headers: { host: "collab.example", "x-forwarded-proto": "https", ...headers } });

  it("says who invites and to which project, with the names made safe", async () => {
    const project = await createProject(ownerId, { name: 'Курсовая "<script>alert(1)</script>"' });
    projectIds.push(project.id);

    const response = await preview(`/join/${project.inviteCode}`);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain(
      '<meta property="og:title" content="Аня &lt;b&gt; приглашает вас в проект «Курсовая &quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot;»">',
    );
    expect(response.body).not.toContain("<script>");
    expect(response.body).toContain(`<meta property="og:url" content="https://collab.example/join/${project.inviteCode}">`);
    expect(response.body).toContain('<meta property="og:image" content="https://collab.example/og.png">');
    expect(response.body).toContain("редактируйте вместе");
  });

  it("tells a person with a read-only link that the project can be viewed", async () => {
    const project = await createProject(ownerId, { name: "Только чтение" });
    projectIds.push(project.id);
    await updateInviteRole(ownerId, project.id, "viewer");

    const response = await preview(`/join/${project.inviteCode}`);

    expect(response.body).toContain("чтобы посмотреть проект");
    expect(response.body).not.toContain("редактируйте вместе");
  });

  it("describes the site for an unknown invitation and for any other page", async () => {
    for (const path of ["/join/no-such-code", "/", "/projects/123", "/join/a/b"]) {
      const response = await preview(path);
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('<meta property="og:title" content="Collab — совместная работа над проектом">');
      expect(response.body).toContain('<meta property="og:url" content="https://collab.example/">');
    }
  });

  it("takes the public address from the proxy, and never puts a strange host into the page", async () => {
    const behindProxy = await preview("/", { "x-forwarded-host": "site.example", "x-forwarded-proto": "https,http" });
    expect(behindProxy.body).toContain('content="https://site.example/og.png"');

    const strange = await preview("/", { "x-forwarded-host": 'evil"><script>' });
    expect(strange.body).toContain('content="https://localhost/og.png"');
    expect(strange.body).not.toContain("<script>");
  });
});
