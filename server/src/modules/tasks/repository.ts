import { db } from "../../lib/db.js";

export interface TeamMembershipRecord {
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
}

export interface TaskRecord {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignee_id: string | null;
  created_by: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewTaskRecord {
  team_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  created_by: string;
}

export type TaskUpdateFields = Partial<{
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
}>;

/**
 * Local membership check, deliberately not shared with the `teams` module
 * (which is being built concurrently on another branch). Every other query
 * below is scoped through this same table so that a caller can never read,
 * write, or delete a task belonging to a team they don't belong to, even if
 * `requireAuth` were somehow bypassed upstream.
 */
export function isTeamMember(teamId: string, userId: string): Promise<TeamMembershipRecord | undefined> {
  return db("team_members").where({ team_id: teamId, user_id: userId }).first();
}

export function listTasksForTeam(teamId: string, userId: string): Promise<TaskRecord[]> {
  return db("tasks")
    .where("tasks.team_id", teamId)
    .whereExists(
      db("team_members")
        .select(1)
        .whereRaw("team_members.team_id = tasks.team_id")
        .andWhere("team_members.user_id", userId),
    )
    .select("tasks.*");
}

export function getTaskForTeam(teamId: string, taskId: string): Promise<TaskRecord | undefined> {
  return db("tasks").where({ id: taskId, team_id: teamId }).first();
}

export async function createTask(record: NewTaskRecord): Promise<TaskRecord> {
  const [task] = await db("tasks").insert(record).returning("*");
  return task;
}

export async function updateTask(
  teamId: string,
  taskId: string,
  fields: TaskUpdateFields,
): Promise<TaskRecord | undefined> {
  const [task] = await db("tasks")
    .where({ id: taskId, team_id: teamId })
    .update({ ...fields, updated_at: db.fn.now() })
    .returning("*");
  return task;
}

export function deleteTask(teamId: string, taskId: string): Promise<number> {
  return db("tasks").where({ id: taskId, team_id: teamId }).del();
}
