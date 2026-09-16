import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyToken, type AuthedUser } from "../lib/jwt.js";

export type { AuthedUser };

declare module "hono" {
  interface ContextVariableMap {
    user: AuthedUser;
  }
}

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  try {
    const payload = verifyToken(token);
    c.set("user", payload);
  } catch {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  await next();
}
