import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./schema.js";

describe("auth schema", () => {
  describe("signupSchema", () => {
    it("normalizes email by trimming and lowercasing", () => {
      const result = signupSchema.parse({
        email: "  Foo@Example.COM  ",
        password: "password123",
        name: "  Foo Bar  ",
      });

      expect(result.email).toBe("foo@example.com");
    });

    it("trims the name but does not lowercase it", () => {
      const result = signupSchema.parse({
        email: "foo@example.com",
        password: "password123",
        name: "  Foo Bar  ",
      });

      expect(result.name).toBe("Foo Bar");
    });

    it("rejects an empty name", () => {
      expect(() =>
        signupSchema.parse({ email: "foo@example.com", password: "password123", name: "   " }),
      ).toThrow();
    });

    it("rejects a short password", () => {
      expect(() =>
        signupSchema.parse({ email: "foo@example.com", password: "short", name: "Foo" }),
      ).toThrow();
    });

    it("rejects an invalid email", () => {
      expect(() =>
        signupSchema.parse({ email: "not-an-email", password: "password123", name: "Foo" }),
      ).toThrow();
    });
  });

  describe("loginSchema", () => {
    it("normalizes email by trimming and lowercasing", () => {
      const result = loginSchema.parse({ email: " Foo@Example.COM ", password: "password123" });

      expect(result.email).toBe("foo@example.com");
    });
  });
});
