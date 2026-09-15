import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { createCommentSchema } from "./schema.js";
import { createCommentForTask, deleteCommentForTask, getCommentsForTask } from "./service.js";

export const commentsRoutes = new Hono();

commentsRoutes.use("*", requireAuth);

function statusForReason(reason: "not_member" | "not_found" | "forbidden"): 403 | 404 {
  switch (reason) {
    case "not_member":
      return 403;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
  }
}

commentsRoutes.get("/tasks/:taskId/comments", async (c) => {
  const taskId = c.req.param("taskId");
  const user = c.get("user");

  const result = await getCommentsForTask(taskId, user.id);
  if (!result.ok) {
    return c.json({ error: "Forbidden" }, statusForReason(result.reason));
  }

  return c.json(result.data);
});

commentsRoutes.post("/tasks/:taskId/comments", async (c) => {
  const taskId = c.req.param("taskId");
  const user = c.get("user");

  const body = await c.req.json().catch(() => undefined);
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const result = await createCommentForTask(taskId, user.id, parsed.data);
  if (!result.ok) {
    return c.json({ error: "Forbidden" }, statusForReason(result.reason));
  }

  return c.json(result.data, 201);
});

commentsRoutes.delete("/tasks/:taskId/comments/:commentId", async (c) => {
  const taskId = c.req.param("taskId");
  const commentId = c.req.param("commentId");
  const user = c.get("user");

  const result = await deleteCommentForTask(taskId, commentId, user.id);
  if (!result.ok) {
    const status = statusForReason(result.reason);
    const error = result.reason === "not_found" ? "Not found" : "Forbidden";
    return c.json({ error }, status);
  }

  return c.body(null, 204);
});
