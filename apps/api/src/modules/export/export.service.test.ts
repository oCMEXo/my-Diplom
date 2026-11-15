import { randomUUID } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { textToYjsState } from "../../lib/yjs-text.js";
import { createProject, inviteMember } from "../projects/projects.service.js";
import { exportProject } from "./export.service.js";

describe("project export", () => {
  const userIds: string[] = [];
  const projectIds: string[] = [];

  async function user() {
    const created = await prisma.user.create({
      data: { email: `${randomUUID()}@test.local`, name: "Export", passwordHash: "x" },
    });
    userIds.push(created.id);
    return created;
  }

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("packs the text files of the active branch, with folders, and nothing else", async () => {
    const owner = await user();
    const project = await createProject(owner.id, { name: "Archive" });
    projectIds.push(project.id);
    await prisma.project.update({ where: { id: project.id }, data: { githubOwner: "o", githubRepo: "r", githubBranch: "dev" } });
    const file = (path: string, content: string, extra: object = {}) =>
      prisma.file.create({
        data: { projectId: project.id, path, type: "code", branch: "dev", yjsState: Buffer.from(textToYjsState(content)), ...extra },
      });
    await file("main.js", "console.log('hello')");
    await file("src/lib/util.js", "export {}");
    await file("old.js", "deleted", { deletedAt: new Date(), path: ".trash/x/old.js" });
    await file("other.js", "another branch", { branch: "main" });
    await prisma.file.create({ data: { projectId: project.id, path: "plan.board", type: "board", branch: "dev" } });

    const { name, zip } = await exportProject(owner.id, project.id);
    const entries = unzipSync(new Uint8Array(zip));

    expect(name).toBe("Archive");
    expect(Object.keys(entries).sort()).toEqual(["main.js", "src/lib/util.js"]);
    expect(strFromU8(entries["main.js"]!)).toBe("console.log('hello')");
  });

  it("is open to viewers and closed to strangers", async () => {
    const owner = await user();
    const viewer = await user();
    const stranger = await user();
    const project = await createProject(owner.id, { name: "Access" });
    projectIds.push(project.id);
    await inviteMember(owner.id, project.id, { email: viewer.email, role: "viewer" });

    await expect(exportProject(viewer.id, project.id)).resolves.toBeTruthy();
    await expect(exportProject(stranger.id, project.id)).rejects.toMatchObject({ statusCode: 404 });
  });
});
