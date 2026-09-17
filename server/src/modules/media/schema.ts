import { z } from "zod";

// Media always attaches to exactly one of a task or a comment — never both,
// never neither ("no orphan media", per the PR9 design decision). This shape
// is shared by the upload multipart fields and the list-query params.
const mediaTargetShape = {
  taskId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
};

function hasExactlyOneTarget(data: { taskId?: string; commentId?: string }): boolean {
  return Boolean(data.taskId) !== Boolean(data.commentId);
}

const exactlyOneTargetRefinement = {
  message: "Exactly one of taskId or commentId is required",
  path: ["taskId"],
};

export const mediaTargetSchema = z.object(mediaTargetShape).refine(hasExactlyOneTarget, exactlyOneTargetRefinement);

export type MediaTargetInput = z.infer<typeof mediaTargetSchema>;

export const listMediaQuerySchema = mediaTargetSchema;

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
