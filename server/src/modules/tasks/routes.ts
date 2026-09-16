import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodType, ZodTypeDef } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireTeamMembership } from "../../middleware/team-membership.js";
import { createTask, deleteTask, getTask, getTasksForTeam, updateTask } from "./service.js";
import { createTaskSchema, updateTaskSchema } from "./schema.js";

export const tasksRoutes = new Hono();

tasksRoutes.use("*", requireAuth);

function parseBody<T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: result.error.flatten(),
    });
  }
  return result.data;
}

function requireParam(c: Context, name: string): string {
  const value = c.req.param(name);
  if (!value) {
    throw new HTTPException(400, { message: `Missing path parameter: ${name}` });
  }
  return value;
}

tasksRoutes.get("/teams/:teamId/tasks", requireTeamMembership("teamId"), async (c) => {
  const user = c.get("user");
  const tasks = await getTasksForTeam(requireParam(c, "teamId"), user.id);
  return c.json(tasks);
});

tasksRoutes.post("/teams/:teamId/tasks", requireTeamMembership("teamId"), async (c) => {
  const user = c.get("user");
  const body = parseBody(createTaskSchema, await c.req.json());
  const task = await createTask(requireParam(c, "teamId"), user.id, body);
  return c.json(task, 201);
});

tasksRoutes.get("/teams/:teamId/tasks/:taskId", requireTeamMembership("teamId"), async (c) => {
  const user = c.get("user");
  const task = await getTask(requireParam(c, "teamId"), requireParam(c, "taskId"), user.id);
  return c.json(task);
});

tasksRoutes.patch("/teams/:teamId/tasks/:taskId", requireTeamMembership("teamId"), async (c) => {
  const user = c.get("user");
  const body = parseBody(updateTaskSchema, await c.req.json());
  const task = await updateTask(requireParam(c, "teamId"), requireParam(c, "taskId"), user.id, body);
  return c.json(task);
});

tasksRoutes.delete("/teams/:teamId/tasks/:taskId", requireTeamMembership("teamId"), async (c) => {
  const user = c.get("user");
  await deleteTask(requireParam(c, "teamId"), requireParam(c, "taskId"), user.id);
  return c.body(null, 204);
});
