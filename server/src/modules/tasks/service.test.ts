import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  isTeamMember: vi.fn(),
  listTasksForTeam: vi.fn(),
  getTaskForTeam: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const repository = await import("./repository.js");
const {
  ForbiddenError,
  NotFoundError,
  createTaskForTeam,
  deleteTaskForTeam,
  getTasksForTeam,
  updateTaskForTeam,
} = await import("./service.js");

const teamId = "team-1";
const userId = "user-1";
const taskId = "task-1";
const membership = { team_id: teamId, user_id: userId, role: "member" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTasksForTeam", () => {
  it("returns the team's tasks when the caller is a member", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.listTasksForTeam).mockResolvedValue([{ id: taskId } as never]);

    const tasks = await getTasksForTeam(teamId, userId);

    expect(tasks).toEqual([{ id: taskId }]);
    expect(repository.listTasksForTeam).toHaveBeenCalledWith(teamId, userId);
  });

  it("throws ForbiddenError for a non-member and never queries tasks", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(undefined);

    await expect(getTasksForTeam(teamId, userId)).rejects.toThrow(ForbiddenError);
    expect(repository.listTasksForTeam).not.toHaveBeenCalled();
  });
});

describe("createTaskForTeam", () => {
  const input = { title: "New task", priority: "medium" as const, status: "todo" as const };

  it("creates the task with created_by set from the authenticated user", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.createTask).mockResolvedValue({ id: taskId } as never);

    await createTaskForTeam(teamId, userId, input);

    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: teamId, created_by: userId, title: "New task", status: "todo" }),
    );
  });

  it("throws ForbiddenError for a non-member and never creates a task", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(undefined);

    await expect(createTaskForTeam(teamId, userId, input)).rejects.toThrow(ForbiddenError);
    expect(repository.createTask).not.toHaveBeenCalled();
  });
});

describe("updateTaskForTeam", () => {
  it("allows moving a task between valid statuses for a member", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.getTaskForTeam).mockResolvedValue({ id: taskId, status: "todo" } as never);
    vi.mocked(repository.updateTask).mockResolvedValue({ id: taskId, status: "in-progress" } as never);

    const result = await updateTaskForTeam(teamId, userId, taskId, { status: "in-progress" });

    expect(result).toEqual({ id: taskId, status: "in-progress" });
    expect(repository.updateTask).toHaveBeenCalledWith(
      teamId,
      taskId,
      expect.objectContaining({ status: "in-progress" }),
    );
  });

  it("only forwards fields that were actually provided", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.getTaskForTeam).mockResolvedValue({ id: taskId, status: "todo" } as never);
    vi.mocked(repository.updateTask).mockResolvedValue({ id: taskId, priority: "high" } as never);

    await updateTaskForTeam(teamId, userId, taskId, { priority: "high" });

    expect(repository.updateTask).toHaveBeenCalledWith(teamId, taskId, { priority: "high" });
  });

  it("throws ForbiddenError for a non-member and never looks up the task", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(undefined);

    await expect(updateTaskForTeam(teamId, userId, taskId, { status: "done" })).rejects.toThrow(ForbiddenError);
    expect(repository.getTaskForTeam).not.toHaveBeenCalled();
    expect(repository.updateTask).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the task doesn't belong to the team", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.getTaskForTeam).mockResolvedValue(undefined);

    await expect(updateTaskForTeam(teamId, userId, taskId, { status: "done" })).rejects.toThrow(NotFoundError);
    expect(repository.updateTask).not.toHaveBeenCalled();
  });
});

describe("deleteTaskForTeam", () => {
  it("deletes the task when the caller is a member and the task exists", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.getTaskForTeam).mockResolvedValue({ id: taskId } as never);

    await deleteTaskForTeam(teamId, userId, taskId);

    expect(repository.deleteTask).toHaveBeenCalledWith(teamId, taskId);
  });

  it("throws ForbiddenError for a non-member and never deletes anything", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(undefined);

    await expect(deleteTaskForTeam(teamId, userId, taskId)).rejects.toThrow(ForbiddenError);
    expect(repository.deleteTask).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a task in a different team", async () => {
    vi.mocked(repository.isTeamMember).mockResolvedValue(membership);
    vi.mocked(repository.getTaskForTeam).mockResolvedValue(undefined);

    await expect(deleteTaskForTeam(teamId, userId, taskId)).rejects.toThrow(NotFoundError);
    expect(repository.deleteTask).not.toHaveBeenCalled();
  });
});
