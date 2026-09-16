import { HTTPException } from "hono/http-exception";
import * as repository from "./repository.js";
import type { TaskRecord } from "./repository.js";
import type { CreateTaskInput, UpdateTaskInput } from "./schema.js";

// Belt-and-suspenders: `requireTeamMembership` already guards these routes,
// but each service function re-verifies membership against the DB itself so
// it stays correct even if called from a context that skipped the
// middleware, per CLAUDE.md's "enforced at both the JWT/middleware layer and
// the DB/query layer" requirement.
async function requireMembership(teamId: string, userId: string) {
  const membership = await repository.findMembership(teamId, userId);
  if (!membership) {
    // 404 rather than 403 so a non-member can't distinguish "team doesn't
    // exist" from "team exists but you're not a member of it".
    throw new HTTPException(404, { message: "Team not found" });
  }
  return membership;
}

async function requireAssigneeIsMember(teamId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const isMember = await repository.isTeamMember(teamId, assigneeId);
  if (!isMember) {
    throw new HTTPException(400, { message: "Assignee must be a member of the team" });
  }
}

export async function getTasksForTeam(teamId: string, userId: string): Promise<TaskRecord[]> {
  await requireMembership(teamId, userId);
  return repository.listTasksForTeam(teamId);
}

export async function getTask(teamId: string, taskId: string, userId: string): Promise<TaskRecord> {
  await requireMembership(teamId, userId);
  const task = await repository.findTaskById(teamId, taskId);
  if (!task) {
    throw new HTTPException(404, { message: "Task not found" });
  }
  return task;
}

export async function createTask(
  teamId: string,
  userId: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  await requireMembership(teamId, userId);
  await requireAssigneeIsMember(teamId, input.assigneeId);

  return repository.createTask(teamId, input, userId);
}

export async function updateTask(
  teamId: string,
  taskId: string,
  userId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord> {
  await requireMembership(teamId, userId);

  const existing = await repository.findTaskById(teamId, taskId);
  if (!existing) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  if (input.assigneeId !== undefined) {
    await requireAssigneeIsMember(teamId, input.assigneeId);
  }

  const updated = await repository.updateTask(teamId, taskId, input);
  if (!updated) {
    throw new HTTPException(404, { message: "Task not found" });
  }
  return updated;
}

// Only owners/admins may delete tasks; regular members may not, per
// CLAUDE.md's "team membership has roles ... governing who can ... delete
// tasks".
export async function deleteTask(teamId: string, taskId: string, userId: string): Promise<void> {
  const membership = await requireMembership(teamId, userId);

  const existing = await repository.findTaskById(teamId, taskId);
  if (!existing) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  if (membership.role === "member") {
    throw new HTTPException(403, { message: "Only team owners and admins can delete tasks" });
  }

  await repository.deleteTask(teamId, taskId);
}
