import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "./error-handler.js";

const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));

vi.mock("../lib/jwt.js", () => ({ verifyToken }));

const { requireAuth } = await import("./auth.js");

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.get("/protected", requireAuth, (c) => c.json(c.get("user")));
  return app;
}

describe("requireAuth", () => {
  beforeEach(() => {
    verifyToken.mockReset();
  });

  it("rejects requests with no Authorization header", async () => {
    const app = buildApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects requests with a malformed Authorization header", async () => {
    const app = buildApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyToken.mockImplementation(() => {
      throw new Error("invalid");
    });
    const app = buildApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer bad-token" },
    });
    expect(res.status).toBe(401);
  });

  it("sets the user on the context for a valid token", async () => {
    verifyToken.mockReturnValue({ id: "user-1", email: "a@example.com" });
    const app = buildApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer good-token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "user-1", email: "a@example.com" });
  });
});
