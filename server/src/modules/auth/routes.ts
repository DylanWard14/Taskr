import { Hono } from "hono";
import { loginSchema, signupSchema } from "./schema.js";
import { login, signup } from "./service.js";

export const authRoutes = new Hono();

authRoutes.post("/signup", async (c) => {
  const body = signupSchema.parse(await c.req.json());
  const result = await signup(body);
  return c.json(result, 201);
});

authRoutes.post("/login", async (c) => {
  const body = loginSchema.parse(await c.req.json());
  const result = await login(body);
  return c.json(result);
});
