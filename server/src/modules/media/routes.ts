import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";

export const mediaRoutes = new Hono();

mediaRoutes.use("*", requireAuth);

mediaRoutes.post("/upload", async (c) => {
  return c.json({ error: "Not implemented" }, 501);
});
