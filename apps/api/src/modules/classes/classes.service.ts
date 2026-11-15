import { prisma } from "@collab/db";
import type { CreateClassInput } from "@collab/shared";
import { requireProjectRole } from "../../lib/authorization.js";
import { activeBranch } from "../../lib/branch.js";
import { AppError } from "../../lib/errors.js";
import { hub } from "../../lib/hub.js";
import { generateInviteCode } from "../../lib/invite-code.js";
import { checkProjectLimit } from "../../lib/limits.js";
import { recordUsage } from "../../lib/usage.js";

const BAD_LINK = "The class link is not valid or has expired";

interface ClassLike {
  id: string;
  name: string;
  taskProjectId: string;
  joinCode: string;
  createdAt: Date;
  _count: { copies: number };
}

function toClassDto(classroom: ClassLike) {
  return {
    id: classroom.id,
    name: classroom.name,
    taskProjectId: classroom.taskProjectId,
    joinCode: classroom.joinCode,
    createdAt: classroom.createdAt.toISOString(),
    studentCount: classroom._count.copies,
  };
}

const withCount = { _count: { select: { copies: true } } } as const;

/** Turns a project the teacher owns into the task of a class; a project has at most one class. */
export async function createClass(userId: string, projectId: string, input: CreateClassInput) {
  await requireProjectRole(projectId, userId, "owner");
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (project.classId) throw new AppError("A student's copy cannot become a class task", 400);

  const existing = await prisma.classroom.findUnique({ where: { taskProjectId: projectId }, include: withCount });
  if (existing) return toClassDto(existing);

  const created = await prisma.classroom.create({
    data: { name: input.name ?? project.name, teacherId: userId, taskProjectId: projectId, joinCode: generateInviteCode() },
    include: withCount,
  });
  return toClassDto(created);
}

export async function listClasses(userId: string) {
  const classes = await prisma.classroom.findMany({
    where: { teacherId: userId },
    include: withCount,
    orderBy: { createdAt: "desc" },
  });
  return classes.map(toClassDto);
}

async function requireTeacher(userId: string, classId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classId }, include: withCount });
  // Like projects: a stranger cannot tell a missing class from someone else's.
  if (!classroom || classroom.teacherId !== userId) throw new AppError("Class not found", 404);
  return classroom;
}

export async function getClass(userId: string, classId: string) {
  const classroom = await requireTeacher(userId, classId);
  const copies = await prisma.project.findMany({
    where: { classId },
    include: { owner: { select: { id: true, name: true, isGuest: true } } },
    orderBy: { createdAt: "asc" },
  });
  const lastEdits = await prisma.file.groupBy({
    by: ["projectId"],
    where: { projectId: { in: copies.map((copy) => copy.id) } },
    _max: { updatedAt: true },
  });
  const lastEditOf = new Map(lastEdits.map((row) => [row.projectId, row._max.updatedAt]));

  return {
    ...toClassDto(classroom),
    students: copies.map((copy) => {
      const lastEdit = lastEditOf.get(copy.id);
      return {
        projectId: copy.id,
        name: copy.owner.name,
        isGuest: copy.owner.isGuest,
        joinedAt: copy.createdAt.toISOString(),
        // The copied files share the creation time; only a later change counts as an edit.
        lastEditAt: lastEdit && lastEdit.getTime() - copy.createdAt.getTime() > 1000 ? lastEdit.toISOString() : null,
        online: hub.presence(copy.id).some((person) => person.id === copy.owner.id),
      };
    }),
  };
}

export async function regenerateClassLink(userId: string, classId: string) {
  await requireTeacher(userId, classId);
  const updated = await prisma.classroom.update({
    where: { id: classId },
    data: { joinCode: generateInviteCode() },
    include: withCount,
  });
  return toClassDto(updated);
}

/** The students keep their copies; they only stop being part of a class. */
export async function deleteClass(userId: string, classId: string) {
  await requireTeacher(userId, classId);
  await prisma.classroom.delete({ where: { id: classId } });
}

export async function previewClass(joinCode: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { joinCode },
    include: { teacher: { select: { name: true } } },
  });
  if (!classroom) throw new AppError(BAD_LINK, 404);
  return { className: classroom.name, teacherName: classroom.teacher.name };
}

/**
 * Gives the student their own copy of the task: the student owns it, the teacher is an editor. Opening
 * the link again leads to the same copy.
 */
export async function joinClass(userId: string, joinCode: string) {
  const classroom = await prisma.classroom.findUnique({ where: { joinCode } });
  if (!classroom) throw new AppError(BAD_LINK, 404);
  if (classroom.teacherId === userId) return { projectId: classroom.taskProjectId };

  const mine = await prisma.project.findFirst({ where: { classId: classroom.id, ownerId: userId }, select: { id: true } });
  if (mine) return { projectId: mine.id };

  await checkProjectLimit(userId);
  const student = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const branch = await activeBranch(classroom.taskProjectId);
  const files = await prisma.file.findMany({
    where: { projectId: classroom.taskProjectId, branch, deletedAt: null },
    select: { path: true, type: true, language: true, yjsState: true },
  });

  const copy = await prisma.project.create({
    data: {
      name: `${classroom.name}: ${student.name}`,
      ownerId: userId,
      inviteCode: generateInviteCode(),
      classId: classroom.id,
      members: {
        create: [
          { userId, role: "owner" },
          { userId: classroom.teacherId, role: "editor" },
        ],
      },
      files: { create: files.map((file) => ({ ...file, yjsState: file.yjsState ?? undefined })) },
    },
  });
  recordUsage("class_joined", { userId, projectId: copy.id });
  return { projectId: copy.id };
}

/** The teacher of a class stays in every student's copy, so they can always help. */
export async function isClassTeacherOf(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { classroom: { select: { teacherId: true } } },
  });
  return project?.classroom?.teacherId === userId;
}
