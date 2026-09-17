import { db } from "../../lib/db.js";

export type TeamRole = "owner" | "admin" | "member";

export interface TeamMembershipRecord {
  team_id: string;
  user_id: string;
  role: TeamRole;
}

export interface MediaRecord {
  id: string;
  url: string;
  content_type: string;
  uploaded_by: string;
  task_id: string | null;
  comment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TaskTeamRow {
  id: string;
  team_id: string;
}

interface CommentTaskRow {
  id: string;
  task_id: string;
}

// A narrow, media-owned lookup of the team a task belongs to — deliberately
// duplicated rather than importing from modules/tasks/repository.ts, to keep
// modules decoupled from one another, mirroring the precedent set by
// comments' own findTaskTeamId.
export async function findTaskTeamId(taskId: string): Promise<string | undefined> {
  const task = await db<TaskTeamRow>("tasks").where({ id: taskId }).first("id", "team_id");
  return task?.team_id;
}

// A narrow, media-owned lookup of the task a comment belongs to — same
// decoupling rationale as findTaskTeamId above. Media attached to a comment
// resolves its team via this task_id, then findTaskTeamId (two hops).
export async function findCommentTaskId(commentId: string): Promise<string | undefined> {
  const comment = await db<CommentTaskRow>("comments").where({ id: commentId }).first("id", "task_id");
  return comment?.task_id;
}

// A narrow, media-owned membership lookup — deliberately duplicated (per the
// same precedent) rather than importing from modules/teams/repository.ts.
export function findMembership(teamId: string, userId: string) {
  return db<TeamMembershipRecord>("team_members")
    .where({ team_id: teamId, user_id: userId })
    .first("team_id", "user_id", "role");
}

export interface InsertMediaInput {
  id: string;
  url: string;
  contentType: string;
  uploadedBy: string;
  taskId?: string;
  commentId?: string;
}

export function insertMedia(input: InsertMediaInput) {
  return db<MediaRecord>("media")
    .insert({
      id: input.id,
      url: input.url,
      content_type: input.contentType,
      uploaded_by: input.uploadedBy,
      task_id: input.taskId ?? null,
      comment_id: input.commentId ?? null,
    })
    .returning("*")
    .then(([media]) => media);
}

export function findMediaById(id: string) {
  return db<MediaRecord>("media").where({ id }).first();
}

export function listMediaForTask(taskId: string) {
  return db<MediaRecord>("media").where({ task_id: taskId }).select("*").orderBy("created_at", "asc");
}

export function listMediaForComment(commentId: string) {
  return db<MediaRecord>("media").where({ comment_id: commentId }).select("*").orderBy("created_at", "asc");
}

export function deleteMediaRow(id: string) {
  return db<MediaRecord>("media").where({ id }).del();
}
