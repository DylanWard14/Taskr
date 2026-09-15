import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { createTaskSchema, updateTaskSchema } from "./schema.js";
import {
  createTaskForTeam,
  deleteTaskForTeam,
  ForbiddenError,
  getTasksForTeam,
  NotFoundError,
  updateTaskForTeam,
} from "./service.js";

export const tasksRoutes = new Hono();

tasksRoutes.use("*", requireAuth);

tasksRoutes.get("/teams/:teamId/tasks", async (c) => {
  const teamId = c.req.param("teamId");
  const user = c.get("user");

  try {
    const tasks = await getTasksForTeam(teamId, user.id);
    return c.json(tasks);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
});

tasksRoutes.post("/teams/:teamId/tasks", async (c) => {
  const teamId = c.req.param("teamId");
  const user = c.get("user");

  const body = await c.req.json().catch(() => undefined);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  try {
    const task = await createTaskForTeam(teamId, user.id, parsed.data);
    return c.json(task, 201);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
});

tasksRoutes.patch("/teams/:teamId/tasks/:taskId", async (c) => {
  const teamId = c.req.param("teamId");
  const taskId = c.req.param("taskId");
  const user = c.get("user");

  const body = await c.req.json().catch(() => undefined);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  try {
    const task = await updateTaskForTeam(teamId, user.id, taskId, parsed.data);
    return c.json(task);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return c.json({ error: err.message }, 403);
    }
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

tasksRoutes.delete("/teams/:teamId/tasks/:taskId", async (c) => {
  const teamId = c.req.param("teamId");
  const taskId = c.req.param("taskId");
  const user = c.get("user");

  try {
    await deleteTaskForTeam(teamId, user.id, taskId);
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return c.json({ error: err.message }, 403);
    }
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});
