import { db } from "../../lib/db.js";

export interface CommentRecord {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMembership {
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
}

/**
 * Returns the comments for a task, but only if `userId` is a member of the
 * task's team. If the task doesn't exist, or the user isn't a member of the
 * task's team, resolves to `null` so the caller can distinguish "not found /
 * not authorized" from "authorized but empty".
 */
export async function listCommentsForTaskAsMember(
  taskId: string,
  userId: string
): Promise<CommentRecord[] | null> {
  const membership = await findTaskTeamMembership(taskId, userId);
  if (!membership) {
    return null;
  }

  return db("comments").where({ task_id: taskId }).orderBy("created_at", "asc").select("*");
}

/**
 * Looks up the caller's membership row for the team that owns `taskId`, by
 * joining tasks -> team_members. Returns undefined if the task doesn't exist
 * or the user isn't a member of that task's team.
 */
export function findTaskTeamMembership(
  taskId: string,
  userId: string
): Promise<TeamMembership | undefined> {
  return db("tasks")
    .join("team_members", "tasks.team_id", "team_members.team_id")
    .where("tasks.id", taskId)
    .andWhere("team_members.user_id", userId)
    .select("team_members.team_id", "team_members.user_id", "team_members.role")
    .first();
}

export function createComment(params: {
  taskId: string;
  authorId: string;
  body: string;
}): Promise<CommentRecord> {
  return db("comments")
    .insert({
      task_id: params.taskId,
      author_id: params.authorId,
      body: params.body,
    })
    .returning("*")
    .then((rows) => rows[0]);
}

export function attachMediaToComment(mediaIds: string[], commentId: string): Promise<number> {
  if (mediaIds.length === 0) {
    return Promise.resolve(0);
  }
  return db("media").whereIn("id", mediaIds).update({ comment_id: commentId });
}

export function findCommentById(commentId: string): Promise<CommentRecord | undefined> {
  return db("comments").where({ id: commentId }).first();
}

export function deleteCommentById(commentId: string): Promise<number> {
  return db("comments").where({ id: commentId }).del();
}
