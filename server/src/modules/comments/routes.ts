import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodType, ZodTypeDef } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { createComment, deleteComment, getCommentsForTask } from "./service.js";
import { createCommentSchema } from "./schema.js";

export const commentsRoutes = new Hono();

commentsRoutes.use("*", requireAuth);

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

// Note: unlike teams/tasks routes, there's no :teamId in this URL shape —
// membership is resolved from the task's team_id inside service.ts
// (requireTaskAccess), so there's no route-level requireTeamMembership
// middleware to reuse here; the service layer is the sole enforcement point.

commentsRoutes.get("/tasks/:taskId/comments", async (c) => {
  const user = c.get("user");
  const comments = await getCommentsForTask(requireParam(c, "taskId"), user.id);
  return c.json(comments);
});

commentsRoutes.post("/tasks/:taskId/comments", async (c) => {
  const user = c.get("user");
  const body = parseBody(createCommentSchema, await c.req.json());
  const comment = await createComment(requireParam(c, "taskId"), user.id, body);
  return c.json(comment, 201);
});

commentsRoutes.delete("/tasks/:taskId/comments/:commentId", async (c) => {
  const user = c.get("user");
  await deleteComment(requireParam(c, "taskId"), requireParam(c, "commentId"), user.id);
  return c.body(null, 204);
});
