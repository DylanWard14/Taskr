import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { getTeamsForUser } from "./service.js";

export const teamsRoutes = new Hono();

teamsRoutes.use("*", requireAuth);

teamsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const teams = await getTeamsForUser(user.id);
  return c.json(teams);
});
