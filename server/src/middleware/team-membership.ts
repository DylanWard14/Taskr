import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { findMembership, type TeamRole } from "../modules/teams/repository.js";

export interface TeamMembershipContext {
  teamId: string;
  role: TeamRole;
}

declare module "hono" {
  interface ContextVariableMap {
    teamMembership: TeamMembershipContext;
  }
}

/**
 * Route-level guard: verifies the authenticated user (set by `requireAuth`,
 * which must run first) is a member of the team identified by the `:id`
 * route param, and stashes their membership/role on the context for
 * downstream handlers via `c.get('teamMembership')`.
 *
 * This exists so "must be a team member to view/act on this team's
 * resources" is enforced consistently at the routing layer across modules
 * (teams' own routes today; tasks/comments routes in later PRs), per
 * CLAUDE.md. It is intentionally not a substitute for scoping queries by
 * team membership at the DB/service layer — service functions still verify
 * membership/role themselves against the database so they remain correct
 * even if called from a context that didn't go through this middleware.
 */
export function requireTeamMembership(paramName = "id") {
  return async function teamMembershipMiddleware(c: Context, next: Next) {
    const teamId = c.req.param(paramName);
    if (!teamId) {
      throw new HTTPException(400, { message: `Missing path parameter: ${paramName}` });
    }
    const user = c.get("user");

    const membership = await findMembership(teamId, user.id);
    if (!membership) {
      // 404 rather than 403 so a non-member can't distinguish "team doesn't
      // exist" from "team exists but you're not a member of it".
      throw new HTTPException(404, { message: "Team not found" });
    }

    c.set("teamMembership", { teamId, role: membership.role });
    await next();
  };
}
