import { Hono } from "hono";
import { ZodError } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { TeamHttpError } from "./errors.js";
import { addMemberSchema, createTeamSchema } from "./schema.js";
import {
  addMember,
  createTeam,
  getTeamForMember,
  getTeamsForUser,
  removeMember,
} from "./service.js";

export const teamsRoutes = new Hono();

teamsRoutes.use("*", requireAuth);

teamsRoutes.onError((err, c) => {
  if (err instanceof TeamHttpError) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({ error: "Invalid request body", details: err.flatten() }, 400);
  }

  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

teamsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const teams = await getTeamsForUser(user.id);
  return c.json(teams);
});

teamsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = createTeamSchema.parse(await c.req.json());
  const team = await createTeam(body, user.id);
  return c.json(team, 201);
});

teamsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const team = await getTeamForMember(c.req.param("id"), user.id);
  return c.json(team);
});

teamsRoutes.post("/:id/members", async (c) => {
  const user = c.get("user");
  const body = addMemberSchema.parse(await c.req.json());
  const membership = await addMember(c.req.param("id"), user.id, body);
  return c.json(membership, 201);
});

teamsRoutes.delete("/:id/members/:userId", async (c) => {
  const user = c.get("user");
  await removeMember(c.req.param("id"), user.id, c.req.param("userId"));
  return c.body(null, 204);
});
