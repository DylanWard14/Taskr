import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(1),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const teamRoleSchema = z.enum(["owner", "admin", "member"]);

// Adds an existing registered user to a team by email — there's no
// invite-token flow yet. Role defaults to "member"; whether the requester is
// actually allowed to grant the requested role (e.g. only owners may grant
// "owner") is a business rule enforced in service.ts, not here.
export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: teamRoleSchema.optional().default("member"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// Deliberately excludes "owner": ownership transfer is a sensitive operation
// with its own invariants (a team must always have >=1 owner) and isn't
// supported through this generic role-update endpoint.
export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
