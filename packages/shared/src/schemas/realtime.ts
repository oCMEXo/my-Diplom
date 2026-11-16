import { z } from "zod";
import { messageSchema } from "./message.js";
import { runEventSchema } from "./run.js";

export const messageCreatedEventSchema = z.object({
  type: z.literal("message.created"),
  message: messageSchema,
});

export const presenceUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isGuest: z.boolean(),
  fileId: z.string().uuid().nullable().optional(),
});
export type PresenceUser = z.infer<typeof presenceUserSchema>;

export const presenceEventSchema = z.object({
  type: z.literal("presence.updated"),
  projectId: z.string().uuid(),
  users: z.array(presenceUserSchema),
});

export const projectBranchEventSchema = z.object({
  type: z.literal("project.branch"),
  projectId: z.string().uuid(),
  branch: z.string(),
});

export const projectMembersEventSchema = z.object({
  type: z.literal("project.members"),
  projectId: z.string().uuid(),
});

export const projectFilesEventSchema = z.object({
  type: z.literal("project.files"),
  projectId: z.string().uuid(),
});

export const realtimeEventSchema = z.union([
  messageCreatedEventSchema,
  presenceEventSchema,
  projectBranchEventSchema,
  projectMembersEventSchema,
  projectFilesEventSchema,
  runEventSchema,
]);
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

export const presenceFileMessageSchema = z.object({
  type: z.literal("presence.file"),
  fileId: z.string().uuid().nullable(),
});
export type PresenceFileMessage = z.infer<typeof presenceFileMessageSchema>;
