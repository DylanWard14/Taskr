import { z } from "zod";

export const uploadMediaMetaSchema = z.object({
  taskId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
});

export type UploadMediaMetaInput = z.infer<typeof uploadMediaMetaSchema>;
