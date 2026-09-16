import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  listTasksForTeam: vi.fn(),
  findTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  findMembership: vi.fn(),
  isTeamMember: vi.fn(),
}));

import * as repository from "./repository.js";
import type { TaskRecord, TeamRole } from "./repository.js";
import { createTask, deleteTask, getTask, getTasksForTeam, updateTask } from "./service.js";

const mocked = vi.mocked(repository);

const TEAM_ID = "team-1";
const OTHER_TEAM_ID = "team-2";
const OWNER_ID = "owner-1";
const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";
const OUTSIDER_ID = "outsider-1";
const ASSIGNEE_ID = "assignee-1";
const TASK_ID = "task-1";

function membership(role: TeamRole, userId = "whoever") {
  return { team_id: TEAM_ID, user_id: userId, role };
}

function task(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: TASK_ID,
    team_id: TEAM_ID,
    title: "Task",
    description: null,
    status: "todo",
    priority: "medium",
    assignee_id: null,
    created_by: OWNER_ID,
    due_date: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe("tasks service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTasksForTeam", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(getTasksForTeam(TEAM_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.listTasksForTeam).not.toHaveBeenCalled();
    });

    it("lists tasks for a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.listTasksForTeam.mockResolvedValueOnce([task()]);

      const result = await getTasksForTeam(TEAM_ID, MEMBER_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe("getTask", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(getTask(TEAM_ID, TASK_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.findTaskById).not.toHaveBeenCalled();
    });

    it("returns 404 when the task doesn't exist in this team", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      await expect(getTask(TEAM_ID, TASK_ID, MEMBER_ID)).rejects.toMatchObject({ status: 404 });
    });

    it("returns 404 when the task belongs to a different team (not leaked)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      // repository is scoped by team_id, so a task from another team simply
      // won't be found for this team.
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      await expect(getTask(TEAM_ID, TASK_ID, MEMBER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.findTaskById).toHaveBeenCalledWith(TEAM_ID, TASK_ID);
    });

    it("returns the task for a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task());

      const result = await getTask(TEAM_ID, TASK_ID, MEMBER_ID);

      expect(result).toEqual(task());
    });
  });

  describe("createTask", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(
        createTask(TEAM_ID, OUTSIDER_ID, {
          title: "New task",
          priority: "medium",
          status: "todo",
        }),
      ).rejects.toMatchObject({ status: 404 });
      expect(mocked.createTask).not.toHaveBeenCalled();
    });

    it("creates a task without an assignee", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.createTask.mockResolvedValueOnce(task());

      const result = await createTask(TEAM_ID, MEMBER_ID, {
        title: "New task",
        priority: "medium",
        status: "todo",
      });

      expect(result).toEqual(task());
      expect(mocked.isTeamMember).not.toHaveBeenCalled();
      expect(mocked.createTask).toHaveBeenCalledWith(
        TEAM_ID,
        { title: "New task", priority: "medium", status: "todo" },
        MEMBER_ID,
      );
    });

    it("creates a task with an assignee who is a team member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.isTeamMember.mockResolvedValueOnce(true);
      mocked.createTask.mockResolvedValueOnce(task({ assignee_id: ASSIGNEE_ID }));

      const result = await createTask(TEAM_ID, MEMBER_ID, {
        title: "New task",
        priority: "medium",
        status: "todo",
        assigneeId: ASSIGNEE_ID,
      });

      expect(result.assignee_id).toBe(ASSIGNEE_ID);
      expect(mocked.isTeamMember).toHaveBeenCalledWith(TEAM_ID, ASSIGNEE_ID);
    });

    it("rejects an assignee who isn't a team member (400)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.isTeamMember.mockResolvedValueOnce(false);

      await expect(
        createTask(TEAM_ID, MEMBER_ID, {
          title: "New task",
          priority: "medium",
          status: "todo",
          assigneeId: ASSIGNEE_ID,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocked.createTask).not.toHaveBeenCalled();
    });

    it("always uses the requesting user as created_by, never a client-supplied value", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.createTask.mockResolvedValueOnce(task());

      await createTask(TEAM_ID, MEMBER_ID, {
        title: "New task",
        priority: "medium",
        status: "todo",
      });

      expect(mocked.createTask).toHaveBeenCalledWith(TEAM_ID, expect.anything(), MEMBER_ID);
    });
  });

  describe("updateTask", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(updateTask(TEAM_ID, TASK_ID, OUTSIDER_ID, { title: "New" })).rejects.toMatchObject({
        status: 404,
      });
      expect(mocked.updateTask).not.toHaveBeenCalled();
    });

    it("returns 404 when the task doesn't exist in this team", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      await expect(updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { title: "New" })).rejects.toMatchObject({
        status: 404,
      });
      expect(mocked.updateTask).not.toHaveBeenCalled();
    });

    it("returns 404 when the task belongs to a different team", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      await expect(
        updateTask(OTHER_TEAM_ID, TASK_ID, MEMBER_ID, { title: "New" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("allows any member to update fields (no role gate)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.updateTask.mockResolvedValueOnce(task({ title: "Updated" }));

      const result = await updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { title: "Updated" });

      expect(result.title).toBe("Updated");
    });

    it("allows any member to move a task's status", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.updateTask.mockResolvedValueOnce(task({ status: "done" }));

      const result = await updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { status: "done" });

      expect(result.status).toBe("done");
    });

    it("rejects changing the assignee to a non-member (400)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.isTeamMember.mockResolvedValueOnce(false);

      await expect(
        updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { assigneeId: ASSIGNEE_ID }),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocked.updateTask).not.toHaveBeenCalled();
    });

    it("allows changing the assignee to a team member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.isTeamMember.mockResolvedValueOnce(true);
      mocked.updateTask.mockResolvedValueOnce(task({ assignee_id: ASSIGNEE_ID }));

      const result = await updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { assigneeId: ASSIGNEE_ID });

      expect(result.assignee_id).toBe(ASSIGNEE_ID);
    });

    it("clears the assignee when assigneeId is explicitly null, skipping membership validation", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task({ assignee_id: ASSIGNEE_ID }));
      mocked.updateTask.mockResolvedValueOnce(task({ assignee_id: null }));

      const result = await updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { assigneeId: null });

      expect(result.assignee_id).toBeNull();
      expect(mocked.isTeamMember).not.toHaveBeenCalled();
      expect(mocked.updateTask).toHaveBeenCalledWith(TEAM_ID, TASK_ID, { assigneeId: null });
    });

    it("clears the due date when dueDate is explicitly null", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task({ due_date: new Date("2026-01-01T00:00:00Z") }));
      mocked.updateTask.mockResolvedValueOnce(task({ due_date: null }));

      const result = await updateTask(TEAM_ID, TASK_ID, MEMBER_ID, { dueDate: null });

      expect(result.due_date).toBeNull();
      expect(mocked.updateTask).toHaveBeenCalledWith(TEAM_ID, TASK_ID, { dueDate: null });
    });
  });

  describe("deleteTask", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(deleteTask(TEAM_ID, TASK_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.deleteTask).not.toHaveBeenCalled();
    });

    it("returns 404 when the task doesn't exist in this team", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      await expect(deleteTask(TEAM_ID, TASK_ID, OWNER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.deleteTask).not.toHaveBeenCalled();
    });

    it("blocks a plain member from deleting (403)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTaskById.mockResolvedValueOnce(task());

      await expect(deleteTask(TEAM_ID, TASK_ID, MEMBER_ID)).rejects.toMatchObject({ status: 403 });
      expect(mocked.deleteTask).not.toHaveBeenCalled();
    });

    it("allows an admin to delete", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.deleteTask.mockResolvedValueOnce(1);

      await deleteTask(TEAM_ID, TASK_ID, ADMIN_ID);

      expect(mocked.deleteTask).toHaveBeenCalledWith(TEAM_ID, TASK_ID);
    });

    it("allows an owner to delete", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.deleteTask.mockResolvedValueOnce(1);

      await deleteTask(TEAM_ID, TASK_ID, OWNER_ID);

      expect(mocked.deleteTask).toHaveBeenCalledWith(TEAM_ID, TASK_ID);
    });
  });
});
