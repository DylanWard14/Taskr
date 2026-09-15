import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = "test-secret";

const { dbMock } = vi.hoisted(() => ({ dbMock: vi.fn() }));

vi.mock("../../../lib/db.js", () => ({
  db: dbMock,
}));

const { commentsRoutes } = await import("../routes.js");

function makeBuilder(result: unknown) {
  const builder: Record<string, unknown> = {
    where: vi.fn(() => builder),
    andWhere: vi.fn(() => builder),
    join: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    whereIn: vi.fn(() => builder),
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    returning: vi.fn(() => builder),
    update: vi.fn(() => Promise.resolve(result)),
    del: vi.fn(() => Promise.resolve(result)),
    first: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function tokenFor(userId: string) {
  return jwt.sign({ id: userId, email: `${userId}@example.com` }, "test-secret");
}

const app = new Hono();
app.route("/", commentsRoutes);

beforeEach(() => {
  dbMock.mockReset();
});

describe("GET /tasks/:taskId/comments", () => {
  it("returns 401 without a token", async () => {
    const res = await app.request("/tasks/task-1/comments");
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller isn't a member of the task's team", async () => {
    dbMock.mockReturnValue(makeBuilder(undefined));

    const res = await app.request("/tasks/task-1/comments", {
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
    });

    expect(res.status).toBe(403);
  });

  it("returns 200 with comments when the caller is a member", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const comments = [{ id: "c1", task_id: "task-1", author_id: "user-1", body: "hi" }];
    dbMock.mockReturnValueOnce(makeBuilder(membership)).mockReturnValueOnce(makeBuilder(comments));

    const res = await app.request("/tasks/task-1/comments", {
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(comments);
  });
});

describe("POST /tasks/:taskId/comments", () => {
  it("returns 400 for an invalid body", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    dbMock.mockReturnValue(makeBuilder(membership));

    const res = await app.request("/tasks/task-1/comments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor("user-1")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("returns 201 and the created comment for a team member", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const created = { id: "c1", task_id: "task-1", author_id: "user-1", body: "hello" };
    dbMock.mockReturnValueOnce(makeBuilder(membership)).mockReturnValueOnce(makeBuilder([created]));

    const res = await app.request("/tasks/task-1/comments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor("user-1")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "hello" }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it("returns 403 for a non-member", async () => {
    dbMock.mockReturnValue(makeBuilder(undefined));

    const res = await app.request("/tasks/task-1/comments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenFor("user-1")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "hello" }),
    });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /tasks/:taskId/comments/:commentId", () => {
  it("returns 204 when the author deletes their own comment", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const comment = { id: "comment-1", task_id: "task-1", author_id: "user-1", body: "hi" };
    dbMock
      .mockReturnValueOnce(makeBuilder(membership))
      .mockReturnValueOnce(makeBuilder(comment))
      .mockReturnValueOnce(makeBuilder(1));

    const res = await app.request("/tasks/task-1/comments/comment-1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
    });

    expect(res.status).toBe(204);
  });

  it("returns 403 when a non-author, non-admin member tries to delete", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const comment = { id: "comment-1", task_id: "task-1", author_id: "someone-else", body: "hi" };
    dbMock.mockReturnValueOnce(makeBuilder(membership)).mockReturnValueOnce(makeBuilder(comment));

    const res = await app.request("/tasks/task-1/comments/comment-1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
    });

    expect(res.status).toBe(403);
  });

  it("returns 404 when the comment doesn't exist", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    dbMock.mockReturnValueOnce(makeBuilder(membership)).mockReturnValueOnce(makeBuilder(undefined));

    const res = await app.request("/tasks/task-1/comments/comment-1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
    });

    expect(res.status).toBe(404);
  });
});
