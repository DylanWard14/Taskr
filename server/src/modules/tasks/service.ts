import type { CreateTaskInput, UpdateTaskInput } from "./schema.js";
import {
  createTask,
  deleteTask,
  getTaskForTeam,
  isTeamMember,
  listTasksForTeam,
  updateTask,
  type TaskRecord,
} from "./repository.js";

export class ForbiddenError extends Error {
  constructor(message = "You are not a member of this team") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Task not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

async function assertTeamMember(teamId: string, userId: string): Promise<void> {
  const membership = await isTeamMember(teamId, userId);
  if (!membership) {
    throw new ForbiddenError();
  }
}

export async function getTasksForTeam(teamId: string, userId: string): Promise<TaskRecord[]> {
  await assertTeamMember(teamId, userId);
  return listTasksForTeam(teamId, userId);
}

export async function createTaskForTeam(
  teamId: string,
  userId: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  await assertTeamMember(teamId, userId);
  return createTask({
    team_id: teamId,
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    priority: input.priority,
    assignee_id: input.assigneeId ?? null,
    due_date: input.dueDate ?? null,
    created_by: userId,
  });
}

export async function updateTaskForTeam(
  teamId: string,
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord> {
  await assertTeamMember(teamId, userId);

  const existing = await getTaskForTeam(teamId, taskId);
  if (!existing) {
    throw new NotFoundError();
  }

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.assigneeId !== undefined) updates.assignee_id = input.assigneeId;
  if (input.dueDate !== undefined) updates.due_date = input.dueDate;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.status !== undefined) updates.status = input.status;

  const updated = await updateTask(teamId, taskId, updates);
  if (!updated) {
    throw new NotFoundError();
  }
  return updated;
}

export async function deleteTaskForTeam(teamId: string, userId: string, taskId: string): Promise<void> {
  await assertTeamMember(teamId, userId);

  const existing = await getTaskForTeam(teamId, taskId);
  if (!existing) {
    throw new NotFoundError();
  }

  await deleteTask(teamId, taskId);
}
