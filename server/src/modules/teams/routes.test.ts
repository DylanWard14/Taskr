import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context, Next } from "hono";

vi.mock("../../middleware/auth.js", () => ({
  requireAuth: async (c: Context, next: Next) => {
    c.set("user", { id: "user-1", email: "user1@example.com" });
    await next();
  },
}));

vi.mock("./service.js");

import { teamsRoutes } from "./routes.js";
import { TeamHttpError } from "./errors.js";
import * as service from "./service.js";

const mockedService = vi.mocked(service);

describe("teams routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET / returns the caller's teams", async () => {
    mockedService.getTeamsForUser.mockResolvedValue([{ id: "team-1", name: "Team One" }] as never);

    const res = await teamsRoutes.request("/");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "team-1", name: "Team One" }]);
    expect(mockedService.getTeamsForUser).toHaveBeenCalledWith("user-1");
  });

  it("POST / creates a team and returns 201", async () => {
    mockedService.createTeam.mockResolvedValue({ id: "team-1", name: "New Team" } as never);

    const res = await teamsRoutes.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Team" }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "team-1", name: "New Team" });
  });

  it("GET /:id returns 403 when the caller is not a member", async () => {
    mockedService.getTeamForMember.mockRejectedValue(
      new TeamHttpError(403, "You are not a member of this team"),
    );

    const res = await teamsRoutes.request("/team-1");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "You are not a member of this team" });
  });

  it("GET /:id returns 404 when the team does not exist", async () => {
    mockedService.getTeamForMember.mockRejectedValue(new TeamHttpError(404, "Team not found"));

    const res = await teamsRoutes.request("/missing-team");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Team not found" });
  });

  it("POST /:id/members returns 409 when the user is already a member", async () => {
    mockedService.addMember.mockRejectedValue(
      new TeamHttpError(409, "User is already a member of this team"),
    );

    const res = await teamsRoutes.request("/team-1/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com" }),
    });

    expect(res.status).toBe(409);
  });

  it("DELETE /:id/members/:userId returns 204 on success", async () => {
    mockedService.removeMember.mockResolvedValue(undefined);

    const res = await teamsRoutes.request("/team-1/members/user-2", { method: "DELETE" });

    expect(res.status).toBe(204);
    expect(mockedService.removeMember).toHaveBeenCalledWith("team-1", "user-1", "user-2");
  });

  it("DELETE /:id/members/:userId returns 403 when the caller cannot manage members", async () => {
    mockedService.removeMember.mockRejectedValue(
      new TeamHttpError(403, "Only team owners or admins can manage members"),
    );

    const res = await teamsRoutes.request("/team-1/members/user-2", { method: "DELETE" });

    expect(res.status).toBe(403);
  });
});
