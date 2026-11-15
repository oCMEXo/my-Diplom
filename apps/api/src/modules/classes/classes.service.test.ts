import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@collab/db";
import { textToYjsState, yjsStateToText } from "../../lib/yjs-text.js";
import { createProject, listProjects, removeMember } from "../projects/projects.service.js";
import {
  createClass,
  deleteClass,
  getClass,
  joinClass,
  listClasses,
  previewClass,
  regenerateClassLink,
} from "./classes.service.js";

const userIds: string[] = [];
afterAll(async () => {
  await prisma.project.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function user(name: string, isGuest = false) {
  const created = await prisma.user.create({
    data: { email: `${randomUUID()}@test.local`, name, passwordHash: "not-a-real-hash", isGuest },
  });
  userIds.push(created.id);
  return created;
}

async function classWithTask() {
  const teacher = await user("Teacher");
  const task = await createProject(teacher.id, { name: "Loops" });
  await prisma.file.create({
    data: { projectId: task.id, path: "main.py", type: "code", language: "python", yjsState: Buffer.from(textToYjsState("# TODO: sum 1..10")) },
  });
  await prisma.file.create({ data: { projectId: task.id, path: ".trash/x/old.py", deletedAt: new Date() } });
  const classroom = await createClass(teacher.id, task.id, {});
  return { teacher, task, classroom };
}

describe("classes", () => {
  it("only the owner turns a project into a class, and a project has one class", async () => {
    const { teacher, task, classroom } = await classWithTask();
    expect(classroom).toMatchObject({ name: "Loops", taskProjectId: task.id, studentCount: 0 });
    expect(await createClass(teacher.id, task.id, { name: "Other" })).toMatchObject({ id: classroom.id });

    const stranger = await user("Stranger");
    await expect(createClass(stranger.id, task.id, {})).rejects.toMatchObject({ statusCode: 404 });
    expect(await listClasses(teacher.id)).toEqual([expect.objectContaining({ id: classroom.id })]);
  });

  it("gives every student an own copy of the task, with the teacher as an editor", async () => {
    const { teacher, classroom } = await classWithTask();
    const anna = await user("Anna", true);
    expect(await previewClass(classroom.joinCode)).toEqual({ className: "Loops", teacherName: "Teacher" });

    const { projectId } = await joinClass(anna.id, classroom.joinCode);
    const copy = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: { members: true, files: true } });
    expect(copy).toMatchObject({ name: "Loops: Anna", ownerId: anna.id, classId: classroom.id });
    expect(copy.members.map((member) => [member.userId, member.role]).sort()).toEqual(
      [
        [anna.id, "owner"],
        [teacher.id, "editor"],
      ].sort(),
    );
    expect(copy.files.map((file) => file.path)).toEqual(["main.py"]);
    expect(yjsStateToText(copy.files[0]!.yjsState)).toBe("# TODO: sum 1..10");

    expect(await joinClass(anna.id, classroom.joinCode)).toEqual({ projectId });
    expect(await joinClass(teacher.id, classroom.joinCode)).toEqual({ projectId: classroom.taskProjectId });
  });

  it("shows the teacher every student, and keeps the copies out of the teacher's project list", async () => {
    const { teacher, classroom } = await classWithTask();
    const anna = await user("Anna");
    const vlad = await user("Vlad");
    const annaCopy = await joinClass(anna.id, classroom.joinCode);
    await joinClass(vlad.id, classroom.joinCode);
    await prisma.file.updateMany({ where: { projectId: annaCopy.projectId }, data: { updatedAt: new Date(Date.now() + 60_000) } });

    const detail = await getClass(teacher.id, classroom.id);
    expect(detail.studentCount).toBe(2);
    expect(detail.students.map((student) => student.name)).toEqual(["Anna", "Vlad"]);
    expect(detail.students[0]!.lastEditAt).not.toBeNull();
    expect(detail.students[1]!.lastEditAt).toBeNull();
    expect(detail.students.every((student) => student.online === false)).toBe(true);

    const teacherProjects = await listProjects(teacher.id);
    expect(teacherProjects.map((project) => project.id)).toEqual([classroom.taskProjectId]);
    expect((await listProjects(anna.id)).map((project) => project.id)).toEqual([annaCopy.projectId]);

    await expect(getClass(anna.id, classroom.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("keeps the teacher in a student's copy, but lets the teacher leave", async () => {
    const { teacher, classroom } = await classWithTask();
    const anna = await user("Anna");
    const { projectId } = await joinClass(anna.id, classroom.joinCode);
    await expect(removeMember(anna.id, projectId, teacher.id)).rejects.toMatchObject({ statusCode: 400 });
    await removeMember(teacher.id, projectId, teacher.id);
  });

  it("replaces the link, and deleting the class keeps the students' copies", async () => {
    const { teacher, classroom } = await classWithTask();
    const anna = await user("Anna");
    const { projectId } = await joinClass(anna.id, classroom.joinCode);

    const renewed = await regenerateClassLink(teacher.id, classroom.id);
    await expect(previewClass(classroom.joinCode)).rejects.toMatchObject({ statusCode: 404 });
    expect(await previewClass(renewed.joinCode)).toMatchObject({ className: "Loops" });

    await deleteClass(teacher.id, classroom.id);
    expect(await prisma.project.findUnique({ where: { id: projectId } })).toMatchObject({ classId: null });
  });

  it("does not let a student's copy become a class task", async () => {
    const { classroom } = await classWithTask();
    const anna = await user("Anna");
    const { projectId } = await joinClass(anna.id, classroom.joinCode);
    await expect(createClass(anna.id, projectId, {})).rejects.toMatchObject({ statusCode: 400 });
  });
});
