import { describe, expect, it } from "vitest";
import { addMemberSchema, createTeamSchema, updateMemberRoleSchema } from "./schema.js";

describe("teams schema", () => {
  describe("createTeamSchema", () => {
    it("trims the name", () => {
      const result = createTeamSchema.parse({ name: "  Engineering  " });
      expect(result.name).toBe("Engineering");
    });

    it("rejects an empty name", () => {
      expect(() => createTeamSchema.parse({ name: "   " })).toThrow();
    });
  });

  describe("addMemberSchema", () => {
    it("defaults role to member", () => {
      const result = addMemberSchema.parse({ email: "foo@example.com" });
      expect(result.role).toBe("member");
    });

    it("normalizes email casing/whitespace", () => {
      const result = addMemberSchema.parse({ email: "  Foo@Example.COM  " });
      expect(result.email).toBe("foo@example.com");
    });

    it("accepts an explicit owner/admin role", () => {
      expect(addMemberSchema.parse({ email: "a@example.com", role: "owner" }).role).toBe("owner");
      expect(addMemberSchema.parse({ email: "a@example.com", role: "admin" }).role).toBe("admin");
    });

    it("rejects an invalid role", () => {
      expect(() =>
        addMemberSchema.parse({ email: "a@example.com", role: "superadmin" }),
      ).toThrow();
    });

    it("rejects an invalid email", () => {
      expect(() => addMemberSchema.parse({ email: "not-an-email" })).toThrow();
    });
  });

  describe("updateMemberRoleSchema", () => {
    it("accepts admin and member", () => {
      expect(updateMemberRoleSchema.parse({ role: "admin" }).role).toBe("admin");
      expect(updateMemberRoleSchema.parse({ role: "member" }).role).toBe("member");
    });

    it("rejects owner (ownership transfer isn't supported via this endpoint)", () => {
      expect(() => updateMemberRoleSchema.parse({ role: "owner" })).toThrow();
    });
  });
});
