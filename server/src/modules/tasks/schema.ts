import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in-progress", "done"]);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: taskStatusSchema.default("todo"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
