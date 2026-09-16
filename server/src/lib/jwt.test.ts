import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./jwt.js";

describe("jwt", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it("round-trips a signed token", () => {
    const token = signToken({ id: "user-1", email: "a@example.com" });
    const payload = verifyToken(token);
    expect(payload.id).toBe("user-1");
    expect(payload.email).toBe("a@example.com");
  });

  it("throws when JWT_SECRET is not configured", () => {
    delete process.env.JWT_SECRET;
    expect(() => signToken({ id: "user-1", email: "a@example.com" })).toThrow(
      "JWT_SECRET is not configured",
    );
  });

  it("rejects a token signed with a different secret", () => {
    const token = signToken({ id: "user-1", email: "a@example.com" });
    process.env.JWT_SECRET = "different-secret";
    expect(() => verifyToken(token)).toThrow();
  });
});
