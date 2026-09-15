import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { uploadMediaMetaSchema } from "./schema.js";
import { uploadMedia, type UploadableFile } from "./service.js";

export const mediaRoutes = new Hono();

mediaRoutes.use("*", requireAuth);

function isUploadableFile(value: unknown): value is UploadableFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

mediaRoutes.post("/upload", async (c) => {
  const user = c.get("user");

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!isUploadableFile(file)) {
    return c.json({ error: "No file provided" }, 400);
  }

  const rawTaskId = body["taskId"];
  const rawCommentId = body["commentId"];

  const parsed = uploadMediaMetaSchema.safeParse({
    taskId: typeof rawTaskId === "string" && rawTaskId.length > 0 ? rawTaskId : undefined,
    commentId: typeof rawCommentId === "string" && rawCommentId.length > 0 ? rawCommentId : undefined,
  });

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const media = await uploadMedia({
    file,
    uploadedBy: user.id,
    taskId: parsed.data.taskId,
    commentId: parsed.data.commentId,
  });

  return c.json(media, 201);
});
