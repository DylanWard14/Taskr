import { describe, expect, it } from "vitest";
import { createTaskSchema, updateTaskSchema } from "./schema.js";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const VALID_DATE = "2026-01-01T00:00:00.000Z";

describe("tasks schema", () => {
  describe("createTaskSchema", () => {
    it("defaults priority to medium and status to todo", () => {
      const result = createTaskSchema.parse({ title: "Do the thing" });
      expect(result.priority).toBe("medium");
      expect(result.status).toBe("todo");
    });

    it("rejects an empty title", () => {
      expect(() => createTaskSchema.parse({ title: "" })).toThrow();
    });

    it("accepts a full payload", () => {
      const result = createTaskSchema.parse({
        title: "Do the thing",
        description: "Details",
        assigneeId: VALID_UUID,
        dueDate: VALID_DATE,
        priority: "high",
        status: "in-progress",
      });
      expect(result).toMatchObject({
        title: "Do the thing",
        description: "Details",
        assigneeId: VALID_UUID,
        dueDate: VALID_DATE,
        priority: "high",
        status: "in-progress",
      });
    });

    it("rejects an invalid status", () => {
      expect(() => createTaskSchema.parse({ title: "T", status: "archived" })).toThrow();
    });

    it("rejects an invalid priority", () => {
      expect(() => createTaskSchema.parse({ title: "T", priority: "urgent" })).toThrow();
    });

    it("rejects a non-uuid assigneeId", () => {
      expect(() => createTaskSchema.parse({ title: "T", assigneeId: "not-a-uuid" })).toThrow();
    });

    it("rejects a non-ISO dueDate", () => {
      expect(() => createTaskSchema.parse({ title: "T", dueDate: "01/01/2026" })).toThrow();
    });
  });

  describe("updateTaskSchema", () => {
    it("requires at least one field", () => {
      expect(() => updateTaskSchema.parse({})).toThrow();
    });

    it("accepts a single field", () => {
      const result = updateTaskSchema.parse({ title: "New title" });
      expect(result.title).toBe("New title");
    });

    it("accepts a status-only patch (drag-to-move-column)", () => {
      const result = updateTaskSchema.parse({ status: "done" });
      expect(result.status).toBe("done");
    });

    it("rejects an invalid status", () => {
      expect(() => updateTaskSchema.parse({ status: "archived" })).toThrow();
    });

    it("rejects an invalid priority", () => {
      expect(() => updateTaskSchema.parse({ priority: "urgent" })).toThrow();
    });

    it("rejects a non-uuid assigneeId", () => {
      expect(() => updateTaskSchema.parse({ assigneeId: "not-a-uuid" })).toThrow();
    });

    it("accepts a null assigneeId to clear the assignee", () => {
      const result = updateTaskSchema.parse({ assigneeId: null });
      expect(result.assigneeId).toBeNull();
    });

    it("rejects a non-ISO dueDate", () => {
      expect(() => updateTaskSchema.parse({ dueDate: "01/01/2026" })).toThrow();
    });

    it("accepts a null dueDate to clear the due date", () => {
      const result = updateTaskSchema.parse({ dueDate: null });
      expect(result.dueDate).toBeNull();
    });
  });
});
