import { HTTPException } from "hono/http-exception";
import * as repository from "./repository.js";
import type { CommentRecord, TeamMembershipRecord } from "./repository.js";
import type { CreateCommentInput } from "./schema.js";

// Comment routes are nested under /tasks/:taskId/comments with no :teamId in
// the URL at all, so membership has to be resolved via task -> team first.
// Belt-and-suspenders per CLAUDE.md: even if a route ever skipped a
// dedicated middleware, this re-verifies membership against the DB itself.
// 404 (not 403) in both the "task doesn't exist" and "task exists but you're
// not a member of its team" cases, so a non-member can't distinguish the two.
async function requireTaskAccess(
  taskId: string,
  userId: string,
): Promise<{ teamId: string; role: TeamMembershipRecord["role"] }> {
  const teamId = await repository.findTaskTeamId(taskId);
  if (!teamId) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  const membership = await repository.findMembership(teamId, userId);
  if (!membership) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  return { teamId, role: membership.role };
}

export async function getCommentsForTask(taskId: string, userId: string): Promise<CommentRecord[]> {
  await requireTaskAccess(taskId, userId);
  return repository.listCommentsForTask(taskId);
}

// Attaching media to a comment is a separate step: create the comment first,
// then upload media (POST /media/upload) with this comment's id as the
// target — there's no "create comment with media ids" flow, since media
// upload always requires an existing task/comment target (see
// modules/media).
export async function createComment(
  taskId: string,
  userId: string,
  input: CreateCommentInput,
): Promise<CommentRecord> {
  await requireTaskAccess(taskId, userId);
  return repository.createComment(taskId, userId, input.body);
}

// A comment's own author can delete their own comment; team owners/admins
// can delete any comment in their team (moderation); a plain member trying
// to delete someone else's comment gets 403.
export async function deleteComment(taskId: string, commentId: string, userId: string): Promise<void> {
  const { role } = await requireTaskAccess(taskId, userId);

  const comment = await repository.findCommentById(taskId, commentId);
  if (!comment) {
    throw new HTTPException(404, { message: "Comment not found" });
  }

  const isAuthor = comment.author_id === userId;
  const isModerator = role === "owner" || role === "admin";
  if (!isAuthor && !isModerator) {
    throw new HTTPException(403, { message: "Only the comment's author or a team owner/admin can delete it" });
  }

  await repository.deleteComment(taskId, commentId);
}
