import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  createTeamWithOwner: vi.fn(),
  listTeamsForUser: vi.fn(),
  findTeamById: vi.fn(),
  findMembership: vi.fn(),
  listTeamMembers: vi.fn(),
  findUserByEmail: vi.fn(),
  addTeamMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  countOwners: vi.fn(),
}));

import jwt from "jsonwebtoken";
import * as repository from "./repository.js";
import { app } from "../../index.js";

const mocked = vi.mocked(repository);

const TEAM_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_USER_ID = "33333333-3333-3333-3333-333333333333";

function tokenFor(id: string, email = "user@example.com") {
  return jwt.sign({ id, email }, "test-secret");
}

function authHeaders(id = USER_ID) {
  return { Authorization: `Bearer ${tokenFor(id)}` };
}

function membership(role: "owner" | "admin" | "member", userId = USER_ID) {
  return {
    team_id: TEAM_ID,
    user_id: userId,
    role,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("teams routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("GET /teams", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request("/teams");
      expect(res.status).toBe(401);
    });

    it("returns the user's teams", async () => {
      mocked.listTeamsForUser.mockResolvedValueOnce([
        { id: TEAM_ID, name: "Eng", created_at: new Date(), updated_at: new Date() },
      ]);

      const res = await app.request("/teams", { headers: authHeaders() });

      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });
  });

  describe("POST /teams", () => {
    it("creates a team and makes the creator its owner", async () => {
      mocked.createTeamWithOwner.mockResolvedValueOnce({
        id: TEAM_ID,
        name: "Engineering",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request("/teams", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Engineering" }),
      });

      expect(res.status).toBe(201);
      expect(mocked.createTeamWithOwner).toHaveBeenCalledWith("Engineering", USER_ID);
    });

    it("returns 400 for an invalid body", async () => {
      const res = await app.request("/teams", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /teams/:id", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("returns the team for a member", async () => {
      // Called once by the requireTeamMembership middleware, once again by
      // the service layer's own membership check.
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTeamById.mockResolvedValueOnce({
        id: TEAM_ID,
        name: "Eng",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request(`/teams/${TEAM_ID}`, { headers: authHeaders() });

      expect(res.status).toBe(200);
    });
  });

  describe("GET /teams/:id/members", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/members`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("lists members for a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.listTeamMembers.mockResolvedValueOnce([
        { user_id: USER_ID, email: "user@example.com", name: "User", role: "member" },
      ]);

      const res = await app.request(`/teams/${TEAM_ID}/members`, { headers: authHeaders() });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /teams/:id/members", () => {
    it("returns 403 when a regular member tries to add someone", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findMembership.mockResolvedValueOnce(membership("member"));

      const res = await app.request(`/teams/${TEAM_ID}/members`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      });

      expect(res.status).toBe(403);
    });

    it("allows an owner to add a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findUserByEmail.mockResolvedValueOnce({
        id: OTHER_USER_ID,
        email: "new@example.com",
        name: "New User",
      });
      mocked.findMembership.mockResolvedValueOnce(undefined);
      mocked.addTeamMember.mockResolvedValueOnce({
        team_id: TEAM_ID,
        user_id: OTHER_USER_ID,
        role: "member",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request(`/teams/${TEAM_ID}/members`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      });

      expect(res.status).toBe(201);
    });
  });

  describe("PATCH /teams/:id/members/:userId", () => {
    it("returns 403 when a non-owner tries to change roles", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));

      const res = await app.request(`/teams/${TEAM_ID}/members/${OTHER_USER_ID}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /teams/:id/members/:userId", () => {
    it("returns 404 for a non-member requester", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/teams/${TEAM_ID}/members/${OTHER_USER_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });

    it("allows an owner or admin to remove a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce({
        ...membership("member"),
        user_id: OTHER_USER_ID,
      });
      mocked.removeMember.mockResolvedValueOnce(1);

      const res = await app.request(`/teams/${TEAM_ID}/members/${OTHER_USER_ID}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      expect(res.status).toBe(204);
    });
  });
});
