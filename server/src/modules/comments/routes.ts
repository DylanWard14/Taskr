import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { getCommentsForTask } from "./service.js";

export const commentsRoutes = new Hono();

commentsRoutes.use("*", requireAuth);

commentsRoutes.get("/tasks/:taskId/comments", async (c) => {
  const taskId = c.req.param("taskId");
  const comments = await getCommentsForTask(taskId);
  return c.json(comments);
});
