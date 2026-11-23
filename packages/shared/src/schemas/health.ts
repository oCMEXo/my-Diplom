import { z } from "zod";

export const clientErrorSchema = z.object({
  message: z.string().min(1).max(500),
  stack: z.string().max(4000).optional(),
  url: z.string().max(500).optional(),
  release: z.string().max(100).optional(),
});
export type ClientError = z.infer<typeof clientErrorSchema>;

export const healthSchema = z.object({ status: z.literal("ok") });

const checkStatusSchema = z.enum(["ok", "down"]);

export const readinessSchema = z.object({
  status: checkStatusSchema,
  database: checkStatusSchema,
  redis: checkStatusSchema,
});
export type Readiness = z.infer<typeof readinessSchema>;
