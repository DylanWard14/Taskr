import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandler } from "./error-handler.js";

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.get("/http-exception", () => {
    throw new HTTPException(409, { message: "Conflict" });
  });
  app.get("/zod-error", (c) => {
    z.object({ name: z.string() }).parse({});
    return c.body(null);
  });
  app.get("/unknown-error", () => {
    throw new Error("boom");
  });
  return app;
}

describe("errorHandler", () => {
  it("returns the HTTPException's own response", async () => {
    const app = buildApp();
    const res = await app.request("/http-exception");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Conflict" });
  });

  it("returns 400 with issues for a ZodError", async () => {
    const app = buildApp();
    const res = await app.request("/zod-error");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Validation failed");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns a generic 500 for unknown errors", async () => {
    const app = buildApp();
    const res = await app.request("/unknown-error");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
  });
});
