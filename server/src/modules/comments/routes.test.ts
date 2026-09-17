import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  findTaskTeamId: vi.fn(),
  findMembership: vi.fn(),
  listCommentsForTask: vi.fn(),
  createComment: vi.fn(),
  findCommentById: vi.fn(),
  deleteComment: vi.fn(),
}));

import jwt from "jsonwebtoken";
import * as repository from "./repository.js";
import type { CommentRecord, TeamRole } from "./repository.js";
import { app } from "../../index.js";

const mocked = vi.mocked(repository);

const TEAM_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const TASK_ID = "33333333-3333-3333-3333-333333333333";
const COMMENT_ID = "44444444-4444-4444-4444-444444444444";
const AUTHOR_ID = "55555555-5555-5555-5555-555555555555";

function tokenFor(id: string, email = "user@example.com") {
  return jwt.sign({ id, email }, "test-secret");
}

function authHeaders(id = USER_ID) {
  return { Authorization: `Bearer ${tokenFor(id)}` };
}

function membership(role: TeamRole, userId = USER_ID) {
  return { team_id: TEAM_ID, user_id: userId, role };
}

function mockMember(role: TeamRole = "member") {
  mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
  mocked.findMembership.mockResolvedValueOnce(membership(role));
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

describe("comments routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("GET /tasks/:taskId/comments", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request(`/tasks/${TASK_ID}/comments`);
      expect(res.status).toBe(401);
    });

    it("returns 404 when the task doesn't exist", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(undefined);

      const res = await app.request(`/tasks/${TASK_ID}/comments`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("returns 404 for a non-member", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/tasks/${TASK_ID}/comments`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("lists comments for a member", async () => {
      mockMember();
      mocked.listCommentsForTask.mockResolvedValueOnce([comment()]);

      const res = await app.request(`/tasks/${TASK_ID}/comments`, { headers: authHeaders() });

      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("POST /tasks/:taskId/comments", () => {
    it("creates a comment (201)", async () => {
      mockMember();
      mocked.createComment.mockResolvedValueOnce(comment({ author_id: USER_ID }));

      const res = await app.request(`/tasks/${TASK_ID}/comments`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello" }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as CommentRecord;
      expect(body.author_id).toBe(USER_ID);
    });

    it("returns 400 for an invalid body", async () => {
      // Body validation happens before requireTaskAccess runs, so no
      // repository mocks are (or should be) consumed here.
      const res = await app.request(`/tasks/${TASK_ID}/comments`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body: "" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-member", async () => {
      mocked.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mocked.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/tasks/${TASK_ID}/comments`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body: "hello" }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /tasks/:taskId/comments/:commentId", () => {
    it("allows the author to delete their own comment (204)", async () => {
      mockMember("member");
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: USER_ID }));
      mocked.deleteComment.mockResolvedValueOnce(1);

      const res = await app.request(`/tasks/${TASK_ID}/comments/${COMMENT_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(204);
    });

    it("blocks a plain member from deleting someone else's comment (403)", async () => {
      mockMember("member");
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: AUTHOR_ID }));

      const res = await app.request(`/tasks/${TASK_ID}/comments/${COMMENT_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(403);
    });

    it("allows an admin to delete someone else's comment (204)", async () => {
      mockMember("admin");
      mocked.findCommentById.mockResolvedValueOnce(comment({ author_id: AUTHOR_ID }));
      mocked.deleteComment.mockResolvedValueOnce(1);

      const res = await app.request(`/tasks/${TASK_ID}/comments/${COMMENT_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(204);
    });

    it("returns 404 when the comment doesn't exist in this task", async () => {
      mockMember("owner");
      mocked.findCommentById.mockResolvedValueOnce(undefined);

      const res = await app.request(`/tasks/${TASK_ID}/comments/${COMMENT_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });
  });
});
