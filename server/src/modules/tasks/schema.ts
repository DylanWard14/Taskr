import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in-progress", "done"]);

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("todo"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// All fields optional — used for PATCH, covering both general edits and
// status-column-drag moves (CLAUDE.md doesn't call for a restricted
// state-machine between statuses, so any member may move a task to any of
// the 3 columns via this same endpoint).
export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
