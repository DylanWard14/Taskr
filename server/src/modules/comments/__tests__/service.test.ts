import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repository.js", () => ({
  attachMediaToComment: vi.fn(),
  createComment: vi.fn(),
  deleteCommentById: vi.fn(),
  findCommentById: vi.fn(),
  findTaskTeamMembership: vi.fn(),
  listCommentsForTaskAsMember: vi.fn(),
}));

const repository = await import("../repository.js");
const { createCommentForTask, deleteCommentForTask, getCommentsForTask } = await import(
  "../service.js"
);

const taskId = "task-1";
const userId = "user-1";

beforeEach(() => {
  vi.mocked(repository.attachMediaToComment).mockReset();
  vi.mocked(repository.createComment).mockReset();
  vi.mocked(repository.deleteCommentById).mockReset();
  vi.mocked(repository.findCommentById).mockReset();
  vi.mocked(repository.findTaskTeamMembership).mockReset();
  vi.mocked(repository.listCommentsForTaskAsMember).mockReset();
});

describe("getCommentsForTask", () => {
  it("returns not_member when the caller isn't on the task's team", async () => {
    vi.mocked(repository.listCommentsForTaskAsMember).mockResolvedValue(null);

    const result = await getCommentsForTask(taskId, userId);

    expect(result).toEqual({ ok: false, reason: "not_member" });
  });

  it("returns the comments when the caller is a team member", async () => {
    const comments = [{ id: "c1" }] as any;
    vi.mocked(repository.listCommentsForTaskAsMember).mockResolvedValue(comments);

    const result = await getCommentsForTask(taskId, userId);

    expect(result).toEqual({ ok: true, data: comments });
  });
});

describe("createCommentForTask", () => {
  it("rejects non-members without creating a comment", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue(undefined);

    const result = await createCommentForTask(taskId, userId, { body: "hi" });

    expect(result).toEqual({ ok: false, reason: "not_member" });
    expect(repository.createComment).not.toHaveBeenCalled();
  });

  it("creates a comment for a team member and attaches media", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "member",
    });
    const created = { id: "c1", task_id: taskId, author_id: userId, body: "hi" } as any;
    vi.mocked(repository.createComment).mockResolvedValue(created);

    const result = await createCommentForTask(taskId, userId, {
      body: "hi",
      mediaIds: ["m1"],
    });

    expect(repository.createComment).toHaveBeenCalledWith({
      taskId,
      authorId: userId,
      body: "hi",
    });
    expect(repository.attachMediaToComment).toHaveBeenCalledWith(["m1"], "c1");
    expect(result).toEqual({ ok: true, data: created });
  });

  it("does not attempt to attach media when none is provided", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "member",
    });
    vi.mocked(repository.createComment).mockResolvedValue({ id: "c1" } as any);

    await createCommentForTask(taskId, userId, { body: "hi" });

    expect(repository.attachMediaToComment).not.toHaveBeenCalled();
  });
});

describe("deleteCommentForTask", () => {
  const commentId = "comment-1";

  it("rejects non-members", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue(undefined);

    const result = await deleteCommentForTask(taskId, commentId, userId);

    expect(result).toEqual({ ok: false, reason: "not_member" });
    expect(repository.deleteCommentById).not.toHaveBeenCalled();
  });

  it("returns not_found when the comment doesn't exist or belongs to a different task", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "member",
    });
    vi.mocked(repository.findCommentById).mockResolvedValue(undefined);

    const result = await deleteCommentForTask(taskId, commentId, userId);

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(repository.deleteCommentById).not.toHaveBeenCalled();
  });

  it("allows the comment's author (a regular member) to delete it", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "member",
    });
    vi.mocked(repository.findCommentById).mockResolvedValue({
      id: commentId,
      task_id: taskId,
      author_id: userId,
      body: "hi",
    } as any);
    vi.mocked(repository.deleteCommentById).mockResolvedValue(1);

    const result = await deleteCommentForTask(taskId, commentId, userId);

    expect(repository.deleteCommentById).toHaveBeenCalledWith(commentId);
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("allows a team admin to delete another member's comment", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "admin",
    });
    vi.mocked(repository.findCommentById).mockResolvedValue({
      id: commentId,
      task_id: taskId,
      author_id: "someone-else",
      body: "hi",
    } as any);
    vi.mocked(repository.deleteCommentById).mockResolvedValue(1);

    const result = await deleteCommentForTask(taskId, commentId, userId);

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("allows a team owner to delete another member's comment", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "owner",
    });
    vi.mocked(repository.findCommentById).mockResolvedValue({
      id: commentId,
      task_id: taskId,
      author_id: "someone-else",
      body: "hi",
    } as any);
    vi.mocked(repository.deleteCommentById).mockResolvedValue(1);

    const result = await deleteCommentForTask(taskId, commentId, userId);

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("forbids a regular member from deleting someone else's comment", async () => {
    vi.mocked(repository.findTaskTeamMembership).mockResolvedValue({
      team_id: "team-1",
      user_id: userId,
      role: "member",
    });
    vi.mocked(repository.findCommentById).mockResolvedValue({
      id: commentId,
      task_id: taskId,
      author_id: "someone-else",
      body: "hi",
    } as any);

    const result = await deleteCommentForTask(taskId, commentId, userId);

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(repository.deleteCommentById).not.toHaveBeenCalled();
  });
});
