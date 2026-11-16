import { z } from "zod";

export const fileVersionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  size: z.number().int().nonnegative(),
  authorName: z.string().nullable(),
});
export type FileVersion = z.infer<typeof fileVersionSchema>;

export const fileVersionContentSchema = fileVersionSchema.extend({ content: z.string() });
export type FileVersionContent = z.infer<typeof fileVersionContentSchema>;
