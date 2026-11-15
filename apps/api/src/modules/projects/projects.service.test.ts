import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@collab/db";
import { ACCESS_CHANGES_CHANNEL, type AccessChange } from "@collab/shared";
import { env } from "../../env.js";
import { closeAccessChanges } from "../../lib/access-changes.js";
import { hub } from "../../lib/hub.js";
import { yjsStateToText } from "../../lib/yjs-text.js";
import {
  createProject,
  deleteProject,
  getProject,
  inviteMember,
  joinViaInvite,
  listProjects,
  regenerateInviteLink,
  removeMember,
  updateInviteRole,
  updateMemberRole,
} from "./projects.service.js";

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@test.local`,
      name: "Test User",
      passwordHash: "not-a-real-hash",
    },
  });
  return user;
}

describe("projects.service", () => {
  const createdUserIds: string[] = [];
  const createdProjectIds: string[] = [];

  async function user() {
    const u = await createTestUser();
    createdUserIds.push(u.id);
    return u;
  }

  async function project(ownerId: string, name = "Test project") {
    const p = await createProject(ownerId, { name });
    createdProjectIds.push(p.id);
    return p;
  }

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("creates a project with the creator as owner", async () => {
    const owner = await user();
    const p = await project(owner.id);

    expect(p.ownerId).toBe(owner.id);
    expect(p.myRole).toBe("owner");
    expect(await prisma.file.count({ where: { projectId: p.id } })).toBe(0);
  });

  it("starts a project from an example with a guide and a file that can run", async () => {
    const owner = await user();
    const p = await createProject(owner.id, { name: "With an example", template: "python" });
    createdProjectIds.push(p.id);

    const files = await prisma.file.findMany({ where: { projectId: p.id }, orderBy: { path: "asc" } });
    expect(files.map((file) => [file.path, file.type, file.language, file.branch])).toEqual([
      ["README.md", "doc", "markdown", ""],
      ["main.py", "code", "python", ""],
    ]);
    expect(yjsStateToText(files[0]!.yjsState)).toContain("main.py");
    expect(yjsStateToText(files[1]!.yjsState)).toContain("print([fib(i) for i in range(10)])");
  });

  it("lists only projects the user is a member of", async () => {
    const owner = await user();
    const stranger = await user();
    await project(owner.id);

    const ownerProjects = await listProjects(owner.id);
    const strangerProjects = await listProjects(stranger.id);

    expect(ownerProjects.length).toBeGreaterThanOrEqual(1);
    expect(strangerProjects).toHaveLength(0);
  });

  it("hides project existence from non-members (404, not 403)", async () => {
    const owner = await user();
    const stranger = await user();
    const p = await project(owner.id);

    await expect(getProject(stranger.id, p.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("lets the owner invite a member and the member sees the project", async () => {
    const owner = await user();
    const member = await user();
    const p = await project(owner.id);

    const invited = await inviteMember(owner.id, p.id, { email: member.email, role: "editor" });
    expect(invited.role).toBe("editor");

    const fetched = await getProject(member.id, p.id);
    expect(fetched.members).toHaveLength(2);
  });

  it("rejects invites from a non-owner editor", async () => {
    const owner = await user();
    const editor = await user();
    const outsider = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: editor.email, role: "editor" });

    await expect(
      inviteMember(editor.id, p.id, { email: outsider.email, role: "viewer" }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects duplicate invites", async () => {
    const owner = await user();
    const member = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: member.email, role: "viewer" });

    await expect(
      inviteMember(owner.id, p.id, { email: member.email, role: "editor" }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lets the owner change a member's role but not their own", async () => {
    const owner = await user();
    const member = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: member.email, role: "viewer" });

    await updateMemberRole(owner.id, p.id, member.id, "editor");
    const fetched = await getProject(owner.id, p.id);
    expect(fetched.members.find((m) => m.userId === member.id)?.role).toBe("editor");

    await expect(updateMemberRole(owner.id, p.id, owner.id, "editor")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("lets a member leave but not remove the owner", async () => {
    const owner = await user();
    const member = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: member.email, role: "viewer" });

    await removeMember(member.id, p.id, member.id);
    await expect(getProject(member.id, p.id)).rejects.toMatchObject({ statusCode: 404 });

    await expect(removeMember(owner.id, p.id, owner.id)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("deletes a project only for the owner", async () => {
    const owner = await user();
    const member = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: member.email, role: "editor" });

    await expect(deleteProject(member.id, p.id)).rejects.toMatchObject({ statusCode: 403 });

    await deleteProject(owner.id, p.id);
    await expect(getProject(owner.id, p.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("creates a project with a usable invite link defaulting to editor", async () => {
    const owner = await user();
    const p = await project(owner.id);

    expect(p.inviteCode).toBeTruthy();
    expect(p.inviteRole).toBe("editor");
  });

  it("lets anyone with the invite code join with the configured role", async () => {
    const owner = await user();
    const joiner = await user();
    const p = await project(owner.id);

    const joined = await joinViaInvite(joiner.id, p.inviteCode!);
    expect(joined.id).toBe(p.id);
    expect(joined.myRole).toBe("editor");

    const fetched = await getProject(owner.id, p.id);
    expect(fetched.members.find((m) => m.userId === joiner.id)?.role).toBe("editor");
  });

  it("tells the people in the project about a newcomer, once", async () => {
    const owner = await user();
    const joiner = await user();
    const p = await project(owner.id);
    const events: unknown[] = [];
    const broadcast = vi.spyOn(hub, "broadcast").mockImplementation((_projectId, event) => {
      events.push(event);
    });

    await joinViaInvite(joiner.id, p.inviteCode!);
    await joinViaInvite(joiner.id, p.inviteCode!);
    broadcast.mockRestore();

    expect(events).toEqual([{ type: "project.members", projectId: p.id }]);
  });

  it("joining twice with the same code is idempotent and keeps the existing role", async () => {
    const owner = await user();
    const joiner = await user();
    const p = await project(owner.id);

    await joinViaInvite(joiner.id, p.inviteCode!);
    await updateMemberRole(owner.id, p.id, joiner.id, "viewer");

    const { inviteCode } = await getProject(owner.id, p.id);
    const rejoined = await joinViaInvite(joiner.id, inviteCode!);
    expect(rejoined.myRole).toBe("viewer");

    const fetched = await getProject(owner.id, p.id);
    expect(fetched.members).toHaveLength(2);
  });

  it("rejects an unknown invite code", async () => {
    const joiner = await user();
    await expect(joinViaInvite(joiner.id, "not-a-real-code")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("only the owner can regenerate the invite link or change its role", async () => {
    const owner = await user();
    const editor = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: editor.email, role: "editor" });

    await expect(regenerateInviteLink(editor.id, p.id)).rejects.toMatchObject({
      statusCode: 403,
    });

    const regenerated = await regenerateInviteLink(owner.id, p.id);
    expect(regenerated.inviteCode).not.toBe(p.inviteCode);

    await expect(joinViaInvite((await user()).id, p.inviteCode!)).rejects.toMatchObject({
      statusCode: 404,
    });

    const updated = await updateInviteRole(owner.id, p.id, "viewer");
    expect(updated.inviteRole).toBe("viewer");
  });

  describe("telling open connections that access changed", () => {
    let subscriber: Redis;
    const published: AccessChange[] = [];

    beforeAll(async () => {
      subscriber = new Redis(env.REDIS_URL);
      subscriber.on("message", (_channel, raw) => published.push(JSON.parse(raw)));
      await subscriber.subscribe(ACCESS_CHANGES_CHANNEL);
    });

    afterAll(async () => {
      await closeAccessChanges();
      subscriber.disconnect();
    });

    /** Other test files publish too, so only this project's messages count. */
    async function changesFor(projectId: string, count: number) {
      const started = Date.now();
      for (;;) {
        const mine = published.filter((change) => change.projectId === projectId);
        if (mine.length >= count || Date.now() - started > 3000) return mine;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    it("announces a removed member and one who left", async () => {
      const owner = await user();
      const removed = await user();
      const leaver = await user();
      const p = await project(owner.id);
      await inviteMember(owner.id, p.id, { email: removed.email, role: "editor" });
      await inviteMember(owner.id, p.id, { email: leaver.email, role: "editor" });

      await removeMember(owner.id, p.id, removed.id);
      await removeMember(leaver.id, p.id, leaver.id);

      expect(await changesFor(p.id, 2)).toEqual([
        { projectId: p.id, userId: removed.id, reason: "removed" },
        { projectId: p.id, userId: leaver.id, reason: "left" },
      ]);
    });

    it("announces a new role, but not a role that stayed the same", async () => {
      const owner = await user();
      const member = await user();
      const p = await project(owner.id);
      await inviteMember(owner.id, p.id, { email: member.email, role: "editor" });

      await updateMemberRole(owner.id, p.id, member.id, "editor");
      await updateMemberRole(owner.id, p.id, member.id, "viewer");
      await removeMember(owner.id, p.id, member.id);

      expect(await changesFor(p.id, 2)).toEqual([
        { projectId: p.id, userId: member.id, reason: "role" },
        { projectId: p.id, userId: member.id, reason: "removed" },
      ]);
    });

    it("announces a deleted project for everybody in it", async () => {
      const owner = await user();
      const p = await project(owner.id);

      await deleteProject(owner.id, p.id);

      expect(await changesFor(p.id, 1)).toEqual([{ projectId: p.id, reason: "deleted" }]);
    });

    it("announces nothing when the change is refused", async () => {
      const owner = await user();
      const editor = await user();
      const p = await project(owner.id);
      await inviteMember(owner.id, p.id, { email: editor.email, role: "editor" });

      await expect(removeMember(editor.id, p.id, owner.id)).rejects.toMatchObject({ statusCode: 403 });
      await expect(deleteProject(editor.id, p.id)).rejects.toMatchObject({ statusCode: 403 });
      // Messages arrive in order, so once this one is here the refused ones would have been too.
      await updateMemberRole(owner.id, p.id, editor.id, "viewer");

      expect(await changesFor(p.id, 1)).toEqual([{ projectId: p.id, userId: editor.id, reason: "role" }]);
    });
  });

  it("gives the invitation link to owners and editors, but not to viewers", async () => {
    const owner = await user();
    const editor = await user();
    const viewer = await user();
    const p = await project(owner.id);
    await inviteMember(owner.id, p.id, { email: editor.email, role: "editor" });
    await inviteMember(owner.id, p.id, { email: viewer.email, role: "viewer" });

    expect((await getProject(owner.id, p.id)).inviteCode).toBe(p.inviteCode);
    expect((await getProject(editor.id, p.id)).inviteCode).toBe(p.inviteCode);
    expect((await getProject(viewer.id, p.id)).inviteCode).toBeNull();
  });

  it("does not show members' e-mail addresses to each other", async () => {
    const owner = await user();
    const p = await project(owner.id);
    const fetched = await getProject(owner.id, p.id);
    expect(fetched.members[0]).not.toHaveProperty("email");
  });

  it("makes the old link useless when somebody is removed or demoted", async () => {
    const owner = await user();
    const member = await user();
    const stranger = await user();
    const p = await project(owner.id);
    await joinViaInvite(member.id, p.inviteCode!);

    // Demoted: they saw the link and must not come back as an editor under another account.
    await updateMemberRole(owner.id, p.id, member.id, "viewer");
    await expect(joinViaInvite(stranger.id, p.inviteCode!)).rejects.toMatchObject({ statusCode: 404 });

    // Removed: the link they still have does not let them back in.
    const afterDemotion = (await getProject(owner.id, p.id)).inviteCode!;
    await updateMemberRole(owner.id, p.id, member.id, "editor");
    await removeMember(owner.id, p.id, member.id);
    await expect(joinViaInvite(member.id, afterDemotion)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("changes the link when a read-only link starts giving write access", async () => {
    const owner = await user();
    const p = await project(owner.id);

    const readOnly = await updateInviteRole(owner.id, p.id, "viewer");
    expect(readOnly.inviteCode).toBe(p.inviteCode);

    const editing = await updateInviteRole(owner.id, p.id, "editor");
    expect(editing.inviteCode).not.toBe(readOnly.inviteCode);
    await expect(joinViaInvite((await user()).id, readOnly.inviteCode)).rejects.toMatchObject({ statusCode: 404 });
  });
});
