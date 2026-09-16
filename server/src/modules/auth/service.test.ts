import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUserByEmail, createUser, signToken, bcryptHash, bcryptCompare } = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  signToken: vi.fn(),
  bcryptHash: vi.fn(),
  bcryptCompare: vi.fn(),
}));

vi.mock("./repository.js", () => ({ findUserByEmail, createUser }));
vi.mock("../../lib/jwt.js", () => ({ signToken }));
vi.mock("bcryptjs", () => ({
  default: { hash: bcryptHash, compare: bcryptCompare },
}));

const { signup, login } = await import("./service.js");

describe("auth service", () => {
  beforeEach(() => {
    findUserByEmail.mockReset();
    createUser.mockReset();
    signToken.mockReset().mockReturnValue("signed-token");
    bcryptHash.mockReset().mockResolvedValue("hashed-password");
    bcryptCompare.mockReset();
  });

  describe("signup", () => {
    it("creates a user and returns a token when the email is unused", async () => {
      findUserByEmail.mockResolvedValue(undefined);
      createUser.mockResolvedValue({
        id: "user-1",
        email: "a@example.com",
        name: "Ada",
        password_hash: "hashed-password",
      });

      const result = await signup({ email: "a@example.com", password: "password1", name: "Ada" });

      expect(bcryptHash).toHaveBeenCalledWith("password1", 10);
      expect(createUser).toHaveBeenCalledWith({
        email: "a@example.com",
        passwordHash: "hashed-password",
        name: "Ada",
      });
      expect(result).toEqual({
        token: "signed-token",
        user: { id: "user-1", email: "a@example.com", name: "Ada" },
      });
    });

    it("rejects signup when the email is already registered", async () => {
      findUserByEmail.mockResolvedValue({ id: "existing" });

      await expect(
        signup({ email: "a@example.com", password: "password1", name: "Ada" }),
      ).rejects.toThrow(HTTPException);
      expect(createUser).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns a token for valid credentials", async () => {
      findUserByEmail.mockResolvedValue({
        id: "user-1",
        email: "a@example.com",
        name: "Ada",
        password_hash: "hashed-password",
      });
      bcryptCompare.mockResolvedValue(true);

      const result = await login({ email: "a@example.com", password: "password1" });

      expect(result).toEqual({
        token: "signed-token",
        user: { id: "user-1", email: "a@example.com", name: "Ada" },
      });
    });

    it("rejects login for an unknown email", async () => {
      findUserByEmail.mockResolvedValue(undefined);

      await expect(login({ email: "nope@example.com", password: "password1" })).rejects.toThrow(
        HTTPException,
      );
      expect(bcryptCompare).not.toHaveBeenCalled();
    });

    it("rejects login for an incorrect password", async () => {
      findUserByEmail.mockResolvedValue({
        id: "user-1",
        email: "a@example.com",
        name: "Ada",
        password_hash: "hashed-password",
      });
      bcryptCompare.mockResolvedValue(false);

      await expect(login({ email: "a@example.com", password: "wrong" })).rejects.toThrow(
        HTTPException,
      );
    });
  });
});
