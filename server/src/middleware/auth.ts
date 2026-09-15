import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";

export interface AuthedUser {
  id: string;
  email: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthedUser;
  }
}

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const secret = process.env.JWT_SECRET ?? "";
    const payload = jwt.verify(token, secret) as AuthedUser;
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
}
