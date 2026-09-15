import { Hono } from "hono";
import { loginSchema } from "./schema.js";
import { login } from "./service.js";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = loginSchema.parse(await c.req.json());
  const result = await login(body);
  return c.json(result);
});
