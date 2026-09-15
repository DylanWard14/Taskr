import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const teamRoleSchema = z.enum(["owner", "admin", "member"]);

export const addMemberSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: teamRoleSchema.default("member"),
  })
  .refine((data) => Boolean(data.userId) || Boolean(data.email), {
    message: "Either userId or email is required",
    path: ["userId"],
  });

export type AddMemberInput = z.infer<typeof addMemberSchema>;
