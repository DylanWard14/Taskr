import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodType, ZodTypeDef } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireTeamMembership } from "../../middleware/team-membership.js";
import {
  addMember,
  createTeam,
  getTeamForUser,
  getTeamMembers,
  getTeamsForUser,
  removeMember,
  updateMemberRole,
} from "./service.js";
import { addMemberSchema, createTeamSchema, updateMemberRoleSchema } from "./schema.js";

export const teamsRoutes = new Hono();

teamsRoutes.use("*", requireAuth);

// Typed as `ZodType<T, ZodTypeDef, unknown>` (rather than `ZodSchema<T>`,
// which the auth module's copy of this helper uses) so that T is inferred
// from the schema's *output* type only — schemas with `.default(...)`
// fields (like addMemberSchema) have an input type that differs from their
// output type, and inferring from `ZodSchema<T>` (which pins
// Input = Output = T) picks up the wrong one, making defaulted fields look
// optional after parsing.
function parseBody<T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, {
      message: "Invalid request body",
      cause: result.error.flatten(),
    });
  }
  return result.data;
}

// Hono's `c.req.param(name)` is typed `string | undefined` whenever the
// param name isn't statically known to be part of the matched literal route
// path (as is the case once a generically-typed middleware like
// `requireTeamMembership()` is in the handler chain). The router guarantees
// the param is present for routes that declare it, so this just narrows the
// type — the 400 branch only fires if that invariant is ever violated.
function requireParam(c: Context, name: string): string {
  const value = c.req.param(name);
  if (!value) {
    throw new HTTPException(400, { message: `Missing path parameter: ${name}` });
  }
  return value;
}

teamsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const teams = await getTeamsForUser(user.id);
  return c.json(teams);
});

teamsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = parseBody(createTeamSchema, await c.req.json());
  const team = await createTeam(user.id, body);
  return c.json(team, 201);
});

teamsRoutes.get("/:id", requireTeamMembership(), async (c) => {
  const user = c.get("user");
  const team = await getTeamForUser(requireParam(c, "id"), user.id);
  return c.json(team);
});

teamsRoutes.get("/:id/members", requireTeamMembership(), async (c) => {
  const user = c.get("user");
  const members = await getTeamMembers(requireParam(c, "id"), user.id);
  return c.json(members);
});

teamsRoutes.post("/:id/members", requireTeamMembership(), async (c) => {
  const user = c.get("user");
  const body = parseBody(addMemberSchema, await c.req.json());
  const member = await addMember(requireParam(c, "id"), user.id, body);
  return c.json(member, 201);
});

teamsRoutes.patch("/:id/members/:userId", requireTeamMembership(), async (c) => {
  const user = c.get("user");
  const body = parseBody(updateMemberRoleSchema, await c.req.json());
  const member = await updateMemberRole(
    requireParam(c, "id"),
    user.id,
    requireParam(c, "userId"),
    body.role,
  );
  return c.json(member);
});

teamsRoutes.delete("/:id/members/:userId", requireTeamMembership(), async (c) => {
  const user = c.get("user");
  await removeMember(requireParam(c, "id"), user.id, requireParam(c, "userId"));
  return c.body(null, 204);
});
