import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  insertUser: vi.fn(),
}));

import jwt from "jsonwebtoken";
import { findUserByEmail, findUserById, insertUser } from "./repository.js";
import { app } from "../../index.js";

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockFindUserById = vi.mocked(findUserById);
const mockInsertUser = vi.mocked(insertUser);

interface AuthResponseBody {
  user: { id: string; email: string; name: string };
  token?: string;
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("POST /auth/signup", () => {
    it("returns 201 and a token for a new user", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);
      mockInsertUser.mockResolvedValueOnce({
        id: "user-1",
        email: "new@example.com",
        password_hash: "hashed",
        name: "New User",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          name: "New User",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as AuthResponseBody;
      expect(body.user).toEqual({ id: "user-1", email: "new@example.com", name: "New User" });
      expect(typeof body.token).toBe("string");
    });

    it("returns 409 when the email is already taken", async () => {
      mockFindUserByEmail.mockResolvedValueOnce({
        id: "existing",
        email: "taken@example.com",
        password_hash: "hashed",
        name: "Existing",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "taken@example.com",
          password: "password123",
          name: "New User",
        }),
      });

      expect(res.status).toBe(409);
      expect(mockInsertUser).not.toHaveBeenCalled();
    });

    it("returns 400 (not 500) for a malformed request body", async () => {
      const res = await app.request("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "short", name: "" }),
      });

      expect(res.status).toBe(400);
      expect(mockFindUserByEmail).not.toHaveBeenCalled();
      expect(mockInsertUser).not.toHaveBeenCalled();
    });

    it("normalizes email casing/whitespace before checking for duplicates", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);
      mockInsertUser.mockResolvedValueOnce({
        id: "user-1",
        email: "foo@example.com",
        password_hash: "hashed",
        name: "Foo",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "  Foo@Example.COM  ", password: "password123", name: "Foo" }),
      });

      expect(res.status).toBe(201);
      expect(mockFindUserByEmail).toHaveBeenCalledWith("foo@example.com");
    });
  });

  describe("POST /auth/login", () => {
    it("returns 200 and a token for valid credentials", async () => {
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash("password123", 10);

      mockFindUserByEmail.mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        password_hash: passwordHash,
        name: "User One",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthResponseBody;
      expect(body.user).toEqual({ id: "user-1", email: "user@example.com", name: "User One" });
    });

    it("returns 401 for an unknown email", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "unknown@example.com", password: "password123" }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 (not 500) for a malformed request body", async () => {
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "short" }),
      });

      expect(res.status).toBe(400);
      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });

    it("returns 401 for the wrong password", async () => {
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash("password123", 10);

      mockFindUserByEmail.mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        password_hash: passwordHash,
        name: "User One",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "wrong-password" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request("/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns the current user for a valid token", async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        password_hash: "hashed",
        name: "User One",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const token = jwt.sign({ id: "user-1", email: "user@example.com" }, "test-secret");

      const res = await app.request("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthResponseBody;
      expect(body.user).toEqual({ id: "user-1", email: "user@example.com", name: "User One" });
    });

    it("returns 401 for a token signed with the wrong secret", async () => {
      const token = jwt.sign({ id: "user-1", email: "user@example.com" }, "wrong-secret");

      const res = await app.request("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
      expect(mockFindUserById).not.toHaveBeenCalled();
    });
  });
});
