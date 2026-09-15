import {
  attachMediaToComment,
  createComment,
  deleteCommentById,
  findCommentById,
  findTaskTeamMembership,
  listCommentsForTaskAsMember,
  type CommentRecord,
} from "./repository.js";
import type { CreateCommentInput } from "./schema.js";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_member" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "forbidden" };

const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function getCommentsForTask(
  taskId: string,
  userId: string
): Promise<ServiceResult<CommentRecord[]>> {
  const comments = await listCommentsForTaskAsMember(taskId, userId);
  if (comments === null) {
    return { ok: false, reason: "not_member" };
  }
  return { ok: true, data: comments };
}

export async function createCommentForTask(
  taskId: string,
  userId: string,
  input: CreateCommentInput
): Promise<ServiceResult<CommentRecord>> {
  const membership = await findTaskTeamMembership(taskId, userId);
  if (!membership) {
    return { ok: false, reason: "not_member" };
  }

  const comment = await createComment({ taskId, authorId: userId, body: input.body });

  if (input.mediaIds && input.mediaIds.length > 0) {
    await attachMediaToComment(input.mediaIds, comment.id);
  }

  return { ok: true, data: comment };
}

export async function deleteCommentForTask(
  taskId: string,
  commentId: string,
  userId: string
): Promise<ServiceResult<void>> {
  const membership = await findTaskTeamMembership(taskId, userId);
  if (!membership) {
    return { ok: false, reason: "not_member" };
  }

  const comment = await findCommentById(commentId);
  if (!comment || comment.task_id !== taskId) {
    return { ok: false, reason: "not_found" };
  }

  const isAuthor = comment.author_id === userId;
  const isTeamAdmin = ADMIN_ROLES.has(membership.role);

  if (!isAuthor && !isTeamAdmin) {
    return { ok: false, reason: "forbidden" };
  }

  await deleteCommentById(commentId);
  return { ok: true, data: undefined };
}
