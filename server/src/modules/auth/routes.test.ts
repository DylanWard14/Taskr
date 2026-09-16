import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/error-handler.js";

const { signup, login } = vi.hoisted(() => ({ signup: vi.fn(), login: vi.fn() }));

vi.mock("./service.js", () => ({ signup, login }));

const { authRoutes } = await import("./routes.js");

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.route("/auth", authRoutes);
  return app;
}

describe("auth routes", () => {
  beforeEach(() => {
    signup.mockReset();
    login.mockReset();
  });

  it("POST /auth/signup returns 201 with the created session", async () => {
    signup.mockResolvedValue({ token: "t", user: { id: "1", email: "a@example.com", name: "Ada" } });
    const app = buildApp();

    const res = await app.request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "password1", name: "Ada" }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ token: "t", user: { id: "1", email: "a@example.com", name: "Ada" } });
  });

  it("POST /auth/signup returns 400 for invalid input", async () => {
    const app = buildApp();

    const res = await app.request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });

    expect(res.status).toBe(400);
    expect(signup).not.toHaveBeenCalled();
  });

  it("POST /auth/signup surfaces a 409 from the service", async () => {
    signup.mockRejectedValue(new HTTPException(409, { message: "Email is already registered" }));
    const app = buildApp();

    const res = await app.request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "password1", name: "Ada" }),
    });

    expect(res.status).toBe(409);
  });

  it("POST /auth/login returns 200 with the session", async () => {
    login.mockResolvedValue({ token: "t", user: { id: "1", email: "a@example.com", name: "Ada" } });
    const app = buildApp();

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "password1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "t", user: { id: "1", email: "a@example.com", name: "Ada" } });
  });

  it("POST /auth/login surfaces a 401 from the service", async () => {
    login.mockRejectedValue(new HTTPException(401, { message: "Invalid email or password" }));
    const app = buildApp();

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "wrongpassword" }),
    });

    expect(res.status).toBe(401);
  });
});
