import { TeamHttpError } from "./errors.js";
import * as repository from "./repository.js";
import type { AddMemberInput, CreateTeamInput } from "./schema.js";
import type { TeamMemberRow, TeamRole } from "./repository.js";

const MANAGER_ROLES: TeamRole[] = ["owner", "admin"];

function isManager(membership: TeamMemberRow): boolean {
  return MANAGER_ROLES.includes(membership.role);
}

export function getTeamsForUser(userId: string) {
  return repository.listTeamsForUser(userId);
}

export function createTeam(input: CreateTeamInput, ownerId: string) {
  return repository.createTeamWithOwner(input.name, ownerId);
}

export async function getTeamForMember(teamId: string, userId: string) {
  const membership = await repository.getMembership(teamId, userId);

  if (!membership) {
    const team = await repository.getTeamById(teamId);
    throw new TeamHttpError(
      team ? 403 : 404,
      team ? "You are not a member of this team" : "Team not found",
    );
  }

  const team = await repository.getTeamById(teamId);
  if (!team) {
    throw new TeamHttpError(404, "Team not found");
  }

  return team;
}

async function requireManager(teamId: string, userId: string): Promise<TeamMemberRow> {
  const membership = await repository.getMembership(teamId, userId);

  if (!membership) {
    throw new TeamHttpError(404, "Team not found");
  }

  if (!isManager(membership)) {
    throw new TeamHttpError(403, "Only team owners or admins can manage members");
  }

  return membership;
}

export async function addMember(teamId: string, actingUserId: string, input: AddMemberInput) {
  await requireManager(teamId, actingUserId);

  const targetUser = input.userId
    ? await repository.findUserById(input.userId)
    : await repository.findUserByEmail(input.email as string);

  if (!targetUser) {
    throw new TeamHttpError(404, "User not found");
  }

  const existingMembership = await repository.getMembership(teamId, targetUser.id);
  if (existingMembership) {
    throw new TeamHttpError(409, "User is already a member of this team");
  }

  await repository.addMember(teamId, targetUser.id, input.role);

  return { teamId, userId: targetUser.id, role: input.role };
}

export async function removeMember(
  teamId: string,
  actingUserId: string,
  targetUserId: string,
): Promise<void> {
  await requireManager(teamId, actingUserId);

  const targetMembership = await repository.getMembership(teamId, targetUserId);
  if (!targetMembership) {
    throw new TeamHttpError(404, "Membership not found");
  }

  if (targetMembership.role === "owner") {
    const ownerCount = await repository.countOwners(teamId);
    if (ownerCount <= 1) {
      throw new TeamHttpError(409, "Cannot remove the last owner of a team");
    }
  }

  await repository.removeMember(teamId, targetUserId);
}
