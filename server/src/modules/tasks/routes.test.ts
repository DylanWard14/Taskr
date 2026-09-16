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

vi.mock("../teams/repository.js", () => ({
  findMembership: vi.fn(),
}));

import jwt from "jsonwebtoken";
import * as repository from "./repository.js";
import type { TaskRecord, TeamRole } from "./repository.js";
import * as teamsRepository from "../teams/repository.js";
import { app } from "../../index.js";

const mocked = vi.mocked(repository);
const mockedTeams = vi.mocked(teamsRepository);

const TEAM_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const TASK_ID = "33333333-3333-3333-3333-333333333333";

function tokenFor(id: string, email = "user@example.com") {
  return jwt.sign({ id, email }, "test-secret");
}

function authHeaders(id = USER_ID) {
  return { Authorization: `Bearer ${tokenFor(id)}` };
}

function membership(role: TeamRole, userId = USER_ID) {
  return { team_id: TEAM_ID, user_id: userId, role };
}

function teamsRepoMembership(role: TeamRole, userId = USER_ID) {
  return { team_id: TEAM_ID, user_id: userId, role, created_at: new Date(), updated_at: new Date() };
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
    created_by: USER_ID,
    due_date: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// The `requireTeamMembership` route middleware checks membership via
// modules/teams/repository.ts (findMembership), and each service function
// re-checks via tasks' own repository.ts (also findMembership) — so most
// happy-path requests need both mocked.
function mockMember(role: TeamRole = "member") {
  mockedTeams.findMembership.mockResolvedValueOnce(teamsRepoMembership(role));
  mocked.findMembership.mockResolvedValueOnce(membership(role));
}

describe("tasks routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("GET /teams/:teamId/tasks", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request(`/teams/${TEAM_ID}/tasks`);
      expect(res.status).toBe(401);
    });

    it("returns 404 for a non-member", async () => {
      mockedTeams.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/tasks`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("lists tasks for a member", async () => {
      mockMember();
      mocked.listTasksForTeam.mockResolvedValueOnce([task()]);

      const res = await app.request(`/teams/${TEAM_ID}/tasks`, { headers: authHeaders() });

      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("POST /teams/:teamId/tasks", () => {
    it("creates a task (201)", async () => {
      mockMember();
      mocked.createTask.mockResolvedValueOnce(task());

      const res = await app.request(`/teams/${TEAM_ID}/tasks`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New task" }),
      });

      expect(res.status).toBe(201);
    });

    it("returns 400 for an invalid body", async () => {
      mockedTeams.findMembership.mockResolvedValueOnce(teamsRepoMembership("member"));

      const res = await app.request(`/teams/${TEAM_ID}/tasks`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-member", async () => {
      mockedTeams.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/tasks`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New task" }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /teams/:teamId/tasks/:taskId", () => {
    it("returns 404 when the task doesn't exist", async () => {
      mockMember();
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });

    it("returns the task for a member", async () => {
      mockMember();
      mocked.findTaskById.mockResolvedValueOnce(task());

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        headers: authHeaders(),
      });

      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /teams/:teamId/tasks/:taskId", () => {
    it("updates a task", async () => {
      mockMember();
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.updateTask.mockResolvedValueOnce(task({ status: "in-progress" }));

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      });

      expect(res.status).toBe(200);
    });

    it("returns 404 when the task doesn't exist", async () => {
      mockMember();
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      });

      expect(res.status).toBe(404);
    });

    it("clears the assignee when assigneeId is explicitly null", async () => {
      mockMember();
      mocked.findTaskById.mockResolvedValueOnce(task({ assignee_id: USER_ID }));
      mocked.updateTask.mockResolvedValueOnce(task({ assignee_id: null }));

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: null }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { assignee_id: string | null };
      expect(body.assignee_id).toBeNull();
      expect(mocked.isTeamMember).not.toHaveBeenCalled();
    });

    it("clears the due date when dueDate is explicitly null", async () => {
      mockMember();
      mocked.findTaskById.mockResolvedValueOnce(task({ due_date: new Date("2026-01-01T00:00:00Z") }));
      mocked.updateTask.mockResolvedValueOnce(task({ due_date: null }));

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: null }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { due_date: string | null };
      expect(body.due_date).toBeNull();
    });
  });

  describe("DELETE /teams/:teamId/tasks/:taskId", () => {
    it("returns 403 when a plain member tries to delete", async () => {
      mockMember("member");
      mocked.findTaskById.mockResolvedValueOnce(task());

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(403);
    });

    it("allows an owner to delete (204)", async () => {
      mockMember("owner");
      mocked.findTaskById.mockResolvedValueOnce(task());
      mocked.deleteTask.mockResolvedValueOnce(1);

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(204);
    });

    it("returns 404 when the task doesn't exist", async () => {
      mockMember("owner");
      mocked.findTaskById.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/tasks/${TASK_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });
  });
});
