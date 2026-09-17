import { db } from "../../lib/db.js";

export type TeamRole = "owner" | "admin" | "member";

export interface TeamMembershipRecord {
  team_id: string;
  user_id: string;
  role: TeamRole;
}

export interface CommentRecord {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: Date;
  updated_at: Date;
}

interface TaskTeamRow {
  id: string;
  team_id: string;
}

// A narrow, comments-owned lookup of the task a comment (or comment-to-be)
// belongs to — deliberately duplicated rather than importing from
// modules/tasks/repository.ts, to keep modules decoupled from one another,
// mirroring the precedent set by tasks' own findMembership. Comments have no
// team_id column of their own; team scoping is always resolved via the task.
export async function findTaskTeamId(taskId: string): Promise<string | undefined> {
  const task = await db<TaskTeamRow>("tasks").where({ id: taskId }).first("id", "team_id");
  return task?.team_id;
}

// A narrow, comments-owned membership lookup — deliberately duplicated (per
// the same precedent) rather than importing from modules/teams/repository.ts
// or modules/tasks/repository.ts.
export function findMembership(teamId: string, userId: string) {
  return db<TeamMembershipRecord>("team_members")
    .where({ team_id: teamId, user_id: userId })
    .first("team_id", "user_id", "role");
}

export function listCommentsForTask(taskId: string) {
  return db<CommentRecord>("comments").where({ task_id: taskId }).select("*").orderBy("created_at", "asc");
}

export function createComment(taskId: string, authorId: string, body: string) {
  return db<CommentRecord>("comments")
    .insert({ task_id: taskId, author_id: authorId, body })
    .returning("*")
    .then(([comment]) => comment);
}

// Scoped by task_id so a comment can never be looked up across task
// boundaries — returns undefined both when the id doesn't exist at all and
// when it belongs to a different task.
export function findCommentById(taskId: string, commentId: string) {
  return db<CommentRecord>("comments").where({ id: commentId, task_id: taskId }).first();
}

export function deleteComment(taskId: string, commentId: string) {
  return db<CommentRecord>("comments").where({ id: commentId, task_id: taskId }).del();
}
