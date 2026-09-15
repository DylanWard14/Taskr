import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { getTasksForTeam } from "./service.js";

export const tasksRoutes = new Hono();

tasksRoutes.use("*", requireAuth);

tasksRoutes.get("/teams/:teamId/tasks", async (c) => {
  const teamId = c.req.param("teamId");
  const tasks = await getTasksForTeam(teamId);
  return c.json(tasks);
});
