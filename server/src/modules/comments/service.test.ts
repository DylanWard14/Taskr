import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  findTaskTeamId: vi.fn(),
  findMembership: vi.fn(),
  listCommentsForTask: vi.fn(),
  createComment: vi.fn(),
  findCommentById: vi.fn(),
  deleteComment: vi.fn(),
}));

import * as repository from "./repository.js";
import type { CommentRecord, TeamRole } from "./repository.js";
import { createComment, deleteComment, getCommentsForTask } from "./service.js";

const mocked = vi.mocked(repository);

const TEAM_ID = "team-1";
const OTHER_TASK_ID = "task-2";
const TASK_ID = "task-1";
const COMMENT_ID = "comment-1";
const AUTHOR_ID = "author-1";
const OWNER_ID = "owner-1";
const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";
const OUTSIDER_ID = "outsider-1";

function membership(role: TeamRole, userId = "whoever") {
  return { team_id: TEAM_ID, user_id: userId, role };
}

function comment(overrides: Partial<CommentRecord> = {}): CommentRecord {
  return {
    id: COMMENT_ID,
    task_id: TASK_ID,
    author_id: AUTHOR_ID,
    body: "hello",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe("comments service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCommentsForTask", () => {
    it("returns 404 when the task doesn't exist at all", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(undefined);

      await expect(getCommentsForTask(TASK_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.findMembership).not.toHaveBeenCalled();
      expect(mocked.listCommentsForTask).not.toHaveBeenCalled();
    });

    it("returns 404 for a non-member (task exists, user isn't in its team)", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(getCommentsForTask(TASK_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.listCommentsForTask).not.toHaveBeenCalled();
    });

    it("lists comments for a member", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.listCommentsForTask.mockResolvedValueOnce([comment()]);

      const result = await getCommentsForTask(TASK_ID, MEMBER_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe("createComment", () => {
    it("returns 404 when the task doesn't exist at all", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(undefined);

      await expect(createComment(TASK_ID, OUTSIDER_ID, { body: "hi" })).rejects.toMatchObject({
        status: 404,
      });
      expect(mocked.createComment).not.toHaveBeenCalled();
    });

    it("returns 404 for a non-member", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(createComment(TASK_ID, OUTSIDER_ID, { body: "hi" })).rejects.toMatchObject({
        status: 404,
      });
      expect(mocked.createComment).not.toHaveBeenCalled();
    });

    it("creates a comment with author_id set from the requester", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.createComment.mockResolvedValueOnce(comment({ author_id: MEMBER_ID }));

      const result = await createComment(TASK_ID, MEMBER_ID, { body: "hi" });

      expect(result.author_id).toBe(MEMBER_ID);
      expect(mocked.createComment).toHaveBeenCalledWith(TASK_ID, MEMBER_ID, "hi");
    });
  });

  describe("deleteComment", () => {
    it("returns 404 when the task doesn't exist at all", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(undefined);

      await expect(deleteComment(TASK_ID, COMMENT_ID, OUTSIDER_ID)).rejects.toMatchObject({
        status: 404,
      });
      expect(mocked.findCommentById).not.toHaveBeenCalled();
    });

    it("returns 404 for a non-member", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(deleteComment(TASK_ID, COMMENT_ID, OUTSIDER_ID)).rejects.toMatchObject({
        status: 404,
      });
      expect(mocked.findCommentById).not.toHaveBeenCalled();
    });

    it("returns 404 when the comment doesn't exist in this task (including belonging to a different task)", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      // repository is scoped by task_id, so a comment from another task
      // simply won't be found for this task.
      mocked.findCommentById.mockResolvedValueOnce(undefined);

      await expect(deleteComment(TASK_ID, COMMENT_ID, MEMBER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.findCommentById).toHaveBeenCalledWith(TASK_ID, COMMENT_ID);
      expect(mocked.deleteComment).not.toHaveBeenCalled();
    });

    it("allows the comment's own author (a plain member) to delete it", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("member", AUTHOR_ID));
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: AUTHOR_ID, task_id: TASK_ID }));
      mocked.deleteComment.mockResolvedValueOnce(1);

      await deleteComment(TASK_ID, COMMENT_ID, AUTHOR_ID);

      expect(mocked.deleteComment).toHaveBeenCalledWith(TASK_ID, COMMENT_ID);
    });

    it("allows an admin to delete someone else's comment", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("admin", ADMIN_ID));
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: AUTHOR_ID }));
      mocked.deleteComment.mockResolvedValueOnce(1);

      await deleteComment(TASK_ID, COMMENT_ID, ADMIN_ID);

      expect(mocked.deleteComment).toHaveBeenCalledWith(TASK_ID, COMMENT_ID);
    });

    it("allows an owner to delete someone else's comment", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("owner", OWNER_ID));
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: AUTHOR_ID }));
      mocked.deleteComment.mockResolvedValueOnce(1);

      await deleteComment(TASK_ID, COMMENT_ID, OWNER_ID);

      expect(mocked.deleteComment).toHaveBeenCalledWith(TASK_ID, COMMENT_ID);
    });

    it("blocks a plain member from deleting someone else's comment (403)", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: AUTHOR_ID }));

      await expect(deleteComment(TASK_ID, COMMENT_ID, MEMBER_ID)).rejects.toMatchObject({ status: 403 });
      expect(mocked.deleteComment).not.toHaveBeenCalled();
    });
  });

  it("cross-task comment ids never resolve (scoped lookup sanity check)", async () => {
    mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
    mocked.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
    mocked.findCommentById.mockResolvedValueOnce(undefined);

    await expect(deleteComment(OTHER_TASK_ID, COMMENT_ID, MEMBER_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});
