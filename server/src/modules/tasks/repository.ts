import { db } from "../../lib/db.js";
import type { CreateTaskInput, UpdateTaskInput } from "./schema.js";

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TeamRole = "owner" | "admin" | "member";

export interface TeamMembershipRecord {
  team_id: string;
  user_id: string;
  role: TeamRole;
}

export interface TaskRecord {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string | null;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export function listTasksForTeam(teamId: string) {
  return db<TaskRecord>("tasks").where({ team_id: teamId }).select("*");
}

// Scoped by team_id so a task can never be looked up across team boundaries
// — returns undefined both when the id doesn't exist at all and when it
// belongs to a different team.
export function findTaskById(teamId: string, taskId: string) {
  return db<TaskRecord>("tasks").where({ id: taskId, team_id: teamId }).first();
}

export function createTask(teamId: string, input: CreateTaskInput, createdBy: string) {
  return db<TaskRecord>("tasks")
    .insert({
      team_id: teamId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId,
      due_date: input.dueDate ? new Date(input.dueDate) : undefined,
      created_by: createdBy,
    })
    .returning("*")
    .then(([task]) => task);
}

export async function updateTask(
  teamId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord | undefined> {
  const updates: Record<string, unknown> = { updated_at: db.fn.now() };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.assigneeId !== undefined) updates.assignee_id = input.assigneeId;
  if (input.dueDate !== undefined) {
    updates.due_date = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.status !== undefined) updates.status = input.status;

  const [task] = await db<TaskRecord>("tasks")
    .where({ id: taskId, team_id: teamId })
    .update(updates)
    .returning("*");
  return task;
}

export function deleteTask(teamId: string, taskId: string) {
  return db<TaskRecord>("tasks").where({ id: taskId, team_id: teamId }).del();
}

// A narrow, tasks-owned membership lookup — deliberately duplicated (rather
// than importing from modules/teams/repository.ts) to keep modules
// decoupled from one another, mirroring the precedent set by teams' own
// findUserByEmail. Used both for the belt-and-suspenders membership/role
// check in service.ts and for validating an assignee belongs to the team.
export function findMembership(teamId: string, userId: string) {
  return db<TeamMembershipRecord>("team_members")
    .where({ team_id: teamId, user_id: userId })
    .first("team_id", "user_id", "role");
}

export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const membership = await findMembership(teamId, userId);
  return membership !== undefined;
}
