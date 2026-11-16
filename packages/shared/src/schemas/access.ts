import { z } from "zod";

export const ACCESS_CHANGES_CHANNEL = "access-changes";

export const CLOSE_ACCESS_REVOKED = 4410;

export const accessChangeReasonSchema = z.enum(["removed", "left", "deleted", "role"]);
export type AccessChangeReason = z.infer<typeof accessChangeReasonSchema>;

export const accessChangeSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  reason: accessChangeReasonSchema,
});
export type AccessChange = z.infer<typeof accessChangeSchema>;
