import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HTTPException } from "hono/http-exception";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { login, signup } from "../service.js";
import * as repository from "../repository.js";
import type { UserRecord } from "../repository.js";

vi.mock("../repository.js", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
}));

const findUserByEmail = vi.mocked(repository.findUserByEmail);
const createUser = vi.mocked(repository.createUser);

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    email: "jane@example.com",
    password_hash: "",
    name: "Jane Doe",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("auth service", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signup", () => {
    it("hashes the password, creates the user, and returns a signed token", async () => {
      findUserByEmail.mockResolvedValue(undefined);
      createUser.mockImplementation(async (input) => buildUser({
        email: input.email,
        name: input.name,
        password_hash: input.passwordHash,
      }));

      const result = await signup({
        email: "jane@example.com",
        password: "supersecret",
        name: "Jane Doe",
      });

      expect(createUser).toHaveBeenCalledTimes(1);
      const createArgs = createUser.mock.calls[0][0];
      expect(createArgs.email).toBe("jane@example.com");
      expect(createArgs.name).toBe("Jane Doe");
      // password must be hashed, never stored/passed in plaintext
      expect(createArgs.passwordHash).not.toBe("supersecret");
      expect(await bcrypt.compare("supersecret", createArgs.passwordHash)).toBe(true);

      expect(result.user).toEqual({
        id: "user-1",
        email: "jane@example.com",
        name: "Jane Doe",
      });

      const decoded = jwt.verify(result.token, "test-secret") as { id: string; email: string };
      expect(decoded.id).toBe("user-1");
      expect(decoded.email).toBe("jane@example.com");
    });

    it("rejects signup when the email is already registered", async () => {
      findUserByEmail.mockResolvedValue(buildUser());

      await expect(
        signup({ email: "jane@example.com", password: "supersecret", name: "Jane Doe" }),
      ).rejects.toMatchObject({ status: 409 });

      expect(createUser).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns a signed token when credentials are valid", async () => {
      const passwordHash = await bcrypt.hash("supersecret", 10);
      findUserByEmail.mockResolvedValue(buildUser({ password_hash: passwordHash }));

      const result = await login({ email: "jane@example.com", password: "supersecret" });

      expect(result.user).toEqual({
        id: "user-1",
        email: "jane@example.com",
        name: "Jane Doe",
      });

      const decoded = jwt.verify(result.token, "test-secret") as { id: string; email: string };
      expect(decoded.id).toBe("user-1");
      expect(decoded.email).toBe("jane@example.com");
    });

    it("rejects login for an unknown email", async () => {
      findUserByEmail.mockResolvedValue(undefined);

      await expect(
        login({ email: "nobody@example.com", password: "supersecret" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("rejects login when the password is wrong", async () => {
      const passwordHash = await bcrypt.hash("supersecret", 10);
      findUserByEmail.mockResolvedValue(buildUser({ password_hash: passwordHash }));

      await expect(
        login({ email: "jane@example.com", password: "wrong-password" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("raises an HTTPException instance on invalid credentials", async () => {
      findUserByEmail.mockResolvedValue(undefined);

      await expect(
        login({ email: "nobody@example.com", password: "supersecret" }),
      ).rejects.toBeInstanceOf(HTTPException);
    });
  });
});
