import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loginSchema, signupSchema } from "./schema.js";
import { login, signup } from "./service.js";

export const authRoutes = new Hono();

authRoutes.post("/signup", async (c) => {
  const parsed = signupSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await signup(parsed.data);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    throw err;
  }
});

authRoutes.post("/login", async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await login(parsed.data);
    return c.json(result);
  } catch (err) {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    throw err;
  }
});
