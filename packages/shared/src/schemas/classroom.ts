import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const classSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  taskProjectId: z.string().uuid(),
  joinCode: z.string(),
  createdAt: z.string().datetime(),
  studentCount: z.number().int(),
});
export type Classroom = z.infer<typeof classSchema>;

export const classStudentSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string(),
  isGuest: z.boolean(),
  joinedAt: z.string().datetime(),
  lastEditAt: z.string().datetime().nullable(),
  online: z.boolean(),
});
export type ClassStudent = z.infer<typeof classStudentSchema>;

export const classDetailSchema = classSchema.extend({
  students: z.array(classStudentSchema),
});
export type ClassDetail = z.infer<typeof classDetailSchema>;

export const classPreviewSchema = z.object({
  className: z.string(),
  teacherName: z.string(),
});
export type ClassPreview = z.infer<typeof classPreviewSchema>;

export const joinClassResultSchema = z.object({ projectId: z.string().uuid() });
export type JoinClassResult = z.infer<typeof joinClassResultSchema>;
