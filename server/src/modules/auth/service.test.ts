import { beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPException } from "hono/http-exception";

vi.mock("./repository.js", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  insertUser: vi.fn(),
}));

// Wrap (rather than replace) bcryptjs's `compare` so we can assert on how
// many times it's invoked without disturbing its real hashing behavior,
// which the other tests in this file rely on. bcryptjs is CommonJS, so its
// default export is the whole module object.
vi.mock("bcryptjs", async (importOriginal) => {
  // bcryptjs uses `export =`, so its type is the module itself, but Vite's
  // CJS interop wraps the real runtime module in a `{ default }` envelope
  // when dynamically imported — reflect that actual shape here.
  const actual = (await importOriginal()) as { default: typeof import("bcryptjs") };
  return {
    default: {
      ...actual.default,
      compare: vi.fn(actual.default.compare),
    },
  };
});

import bcrypt from "bcryptjs";
import { findUserByEmail, findUserById, insertUser } from "./repository.js";
import { getMe, login, signup } from "./service.js";

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockFindUserById = vi.mocked(findUserById);
const mockInsertUser = vi.mocked(insertUser);

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("signup", () => {
    it("creates a new user and returns a token", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);
      mockInsertUser.mockResolvedValueOnce({
        id: "user-1",
        email: "new@example.com",
        password_hash: "hashed",
        name: "New User",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await signup({
        email: "new@example.com",
        password: "password123",
        name: "New User",
      });

      expect(result.user).toEqual({
        id: "user-1",
        email: "new@example.com",
        name: "New User",
      });
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
      expect(mockInsertUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@example.com", name: "New User" }),
      );
      // Never leaks the raw password.
      expect(mockInsertUser.mock.calls[0][0].passwordHash).not.toBe("password123");
    });

    it("rejects signup when the email is already taken", async () => {
      mockFindUserByEmail.mockResolvedValueOnce({
        id: "existing-user",
        email: "taken@example.com",
        password_hash: "hashed",
        name: "Existing",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        signup({ email: "taken@example.com", password: "password123", name: "New User" }),
      ).rejects.toMatchObject({ status: 409 } satisfies Partial<HTTPException>);

      expect(mockInsertUser).not.toHaveBeenCalled();
    });

    it("maps a concurrent duplicate-email insert (unique violation) to a 409", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);
      mockInsertUser.mockRejectedValueOnce(
        Object.assign(new Error("duplicate key value violates unique constraint"), {
          code: "23505",
        }),
      );

      await expect(
        signup({ email: "racey@example.com", password: "password123", name: "New User" }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("propagates non-unique-violation insert errors instead of swallowing them", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);
      mockInsertUser.mockRejectedValueOnce(new Error("connection reset"));

      await expect(
        signup({ email: "new@example.com", password: "password123", name: "New User" }),
      ).rejects.toThrow("connection reset");
    });

    it("throws if JWT_SECRET is not configured", async () => {
      delete process.env.JWT_SECRET;
      mockFindUserByEmail.mockResolvedValueOnce(undefined);
      mockInsertUser.mockResolvedValueOnce({
        id: "user-1",
        email: "new@example.com",
        password_hash: "hashed",
        name: "New User",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        signup({ email: "new@example.com", password: "password123", name: "New User" }),
      ).rejects.toThrow(/JWT_SECRET/);
    });
  });

  describe("login", () => {
    it("logs in successfully with correct credentials", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);

      mockFindUserByEmail.mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        password_hash: passwordHash,
        name: "User One",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await login({ email: "user@example.com", password: "password123" });

      expect(result.user).toEqual({
        id: "user-1",
        email: "user@example.com",
        name: "User One",
      });
      expect(typeof result.token).toBe("string");
    });

    it("rejects login with the wrong password", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);

      mockFindUserByEmail.mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        password_hash: passwordHash,
        name: "User One",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        login({ email: "user@example.com", password: "wrong-password" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("rejects login for an unknown email", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);

      await expect(
        login({ email: "unknown@example.com", password: "password123" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("still runs a bcrypt comparison for unknown emails (timing side-channel mitigation)", async () => {
      mockFindUserByEmail.mockResolvedValueOnce(undefined);

      await expect(
        login({ email: "unknown@example.com", password: "password123" }),
      ).rejects.toMatchObject({ status: 401 });

      expect(vi.mocked(bcrypt.compare)).toHaveBeenCalledTimes(1);
    });
  });

  describe("getMe", () => {
    it("returns the current user", async () => {
      mockFindUserById.mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        password_hash: "hashed",
        name: "User One",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await getMe("user-1");

      expect(result).toEqual({ id: "user-1", email: "user@example.com", name: "User One" });
    });

    it("throws when the user no longer exists", async () => {
      mockFindUserById.mockResolvedValueOnce(undefined);

      await expect(getMe("missing-user")).rejects.toMatchObject({ status: 401 });
    });
  });
});
