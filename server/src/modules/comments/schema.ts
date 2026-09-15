import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string().min(1),
  mediaIds: z.array(z.string().uuid()).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
