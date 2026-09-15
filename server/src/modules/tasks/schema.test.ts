import { describe, expect, it } from "vitest";
import { createTaskSchema, taskStatusSchema, updateTaskSchema } from "./schema.js";

describe("taskStatusSchema", () => {
  it("accepts each valid status", () => {
    for (const status of ["todo", "in-progress", "done"] as const) {
      expect(taskStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects a status that isn't one of the three kanban columns", () => {
    expect(() => taskStatusSchema.parse("archived")).toThrow();
  });
});

describe("createTaskSchema", () => {
  it("defaults status to todo and priority to medium", () => {
    const result = createTaskSchema.parse({ title: "New task" });
    expect(result.status).toBe("todo");
    expect(result.priority).toBe("medium");
  });

  it("requires a non-empty title", () => {
    expect(() => createTaskSchema.parse({ title: "" })).toThrow();
    expect(() => createTaskSchema.parse({})).toThrow();
  });

  it("rejects an invalid status or priority", () => {
    expect(() => createTaskSchema.parse({ title: "Task", status: "blocked" })).toThrow();
    expect(() => createTaskSchema.parse({ title: "Task", priority: "urgent" })).toThrow();
  });
});

describe("updateTaskSchema", () => {
  it("accepts a status-only update (moving a task between columns)", () => {
    const result = updateTaskSchema.parse({ status: "in-progress" });
    expect(result.status).toBe("in-progress");
  });

  it("rejects an invalid status value", () => {
    expect(() => updateTaskSchema.parse({ status: "blocked" })).toThrow();
  });

  it("rejects an empty payload", () => {
    expect(() => updateTaskSchema.parse({})).toThrow();
  });

  it("allows clearing nullable fields like assigneeId and dueDate", () => {
    const result = updateTaskSchema.parse({ assigneeId: null, dueDate: null });
    expect(result.assigneeId).toBeNull();
    expect(result.dueDate).toBeNull();
  });
});
