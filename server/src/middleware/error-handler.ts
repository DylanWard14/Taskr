import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    const body: { error: string; details?: unknown } = { error: err.message };
    if (err.cause !== undefined) {
      body.details = err.cause;
    }
    return c.json(body, err.status);
  }

  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
};
