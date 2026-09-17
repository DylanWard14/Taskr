import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { requireAuth } from "../../middleware/auth.js";
import { MAX_FILE_SIZE_BYTES, deleteMedia, getMediaFile, listMedia, uploadMedia } from "./service.js";
import { listMediaQuerySchema, mediaTargetSchema } from "./schema.js";

export const mediaRoutes = new Hono();

mediaRoutes.use("*", requireAuth);

function requireParam(c: Context, name: string): string {
  const value = c.req.param(name);
  if (!value) {
    throw new HTTPException(400, { message: `Missing path parameter: ${name}` });
  }
  return value;
}

// A cheap first line of defense against grossly oversized request bodies,
// before we even buffer/parse them. Padded above MAX_FILE_SIZE_BYTES to
// leave room for multipart boundary/field overhead — the authoritative size
// check is uploadMedia's own file.size check in service.ts.
const UPLOAD_BODY_LIMIT_BYTES = MAX_FILE_SIZE_BYTES + 64 * 1024;

mediaRoutes.post(
  "/upload",
  bodyLimit({
    maxSize: UPLOAD_BODY_LIMIT_BYTES,
    onError: (c) => c.json({ error: "File exceeds the maximum upload size of 5MB" }, 413),
  }),
  async (c) => {
    const user = c.get("user");
    const body = await c.req.parseBody();

    const file = body.file;
    if (!(file instanceof File)) {
      throw new HTTPException(400, { message: "A file field is required" });
    }

    const target = mediaTargetSchema.safeParse({
      taskId: typeof body.taskId === "string" ? body.taskId : undefined,
      commentId: typeof body.commentId === "string" ? body.commentId : undefined,
    });
    if (!target.success) {
      throw new HTTPException(400, {
        message: "Invalid request body",
        cause: target.error.flatten(),
      });
    }

    const media = await uploadMedia(user.id, { ...target.data, file });
    return c.json(media, 201);
  },
);

mediaRoutes.get("/", async (c) => {
  const user = c.get("user");
  const query = listMediaQuerySchema.safeParse({
    taskId: c.req.query("taskId"),
    commentId: c.req.query("commentId"),
  });
  if (!query.success) {
    throw new HTTPException(400, {
      message: "Invalid query parameters",
      cause: query.error.flatten(),
    });
  }

  const media = await listMedia(user.id, query.data);
  return c.json(media);
});

mediaRoutes.get("/:id/file", async (c) => {
  const user = c.get("user");
  const { contentType, buffer } = await getMediaFile(requireParam(c, "id"), user.id);
  // Standard hardening for an endpoint serving user-uploaded content: never
  // let the browser sniff/reinterpret the body as something other than the
  // declared (and magic-byte-validated) content type.
  return c.body(new Uint8Array(buffer), 200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
});

mediaRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  await deleteMedia(requireParam(c, "id"), user.id);
  return c.body(null, 204);
});
