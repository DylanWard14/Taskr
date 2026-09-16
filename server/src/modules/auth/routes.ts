import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodSchema } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { getMe, login, signup } from "./service.js";
import { loginSchema, signupSchema } from "./schema.js";

export const authRoutes = new Hono();

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: result.error.flatten(),
    });
  }
  return result.data;
}

authRoutes.post("/signup", async (c) => {
  const body = parseBody(signupSchema, await c.req.json());
  const result = await signup(body);
  return c.json(result, 201);
});

authRoutes.post("/login", async (c) => {
  const body = parseBody(loginSchema, await c.req.json());
  const result = await login(body);
  return c.json(result);
});

authRoutes.get("/me", requireAuth, async (c) => {
  const authedUser = c.get("user");
  const user = await getMe(authedUser.id);
  return c.json({ user });
});
