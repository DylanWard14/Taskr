import { HTTPException } from "hono/http-exception";
import * as repository from "./repository.js";
import type { TeamMemberWithUser, TeamRecord, TeamRole } from "./repository.js";
import type { AddMemberInput, CreateTeamInput } from "./schema.js";

export async function createTeam(userId: string, input: CreateTeamInput): Promise<TeamRecord> {
  return repository.createTeamWithOwner(input.name, userId);
}

export function getTeamsForUser(userId: string): Promise<TeamRecord[]> {
  return repository.listTeamsForUser(userId);
}

// Fetches a team, but only for a requesting user who is a member of it. A
// 404 (rather than 403) is thrown for non-members so a non-member can't
// distinguish "no such team" from "team exists but you're not in it".
export async function getTeamForUser(teamId: string, userId: string): Promise<TeamRecord> {
  const membership = await repository.findMembership(teamId, userId);
  if (!membership) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const team = await repository.findTeamById(teamId);
  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  return team;
}

export async function getTeamMembers(
  teamId: string,
  userId: string,
): Promise<TeamMemberWithUser[]> {
  const membership = await repository.findMembership(teamId, userId);
  if (!membership) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  return repository.listTeamMembers(teamId);
}

// Only owners/admins may add members; only an owner may grant the owner
// role. The target user must already be a registered account (looked up by
// email — there's no invite-token flow yet) and must not already be a
// member.
export async function addMember(
  teamId: string,
  requestingUserId: string,
  input: AddMemberInput,
): Promise<TeamMemberWithUser> {
  const requesterMembership = await repository.findMembership(teamId, requestingUserId);
  if (!requesterMembership) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  if (requesterMembership.role === "member") {
    throw new HTTPException(403, { message: "Only team owners and admins can add members" });
  }

  const role: TeamRole = input.role;
  if (role === "owner" && requesterMembership.role !== "owner") {
    throw new HTTPException(403, { message: "Only an owner can grant the owner role" });
  }

  const targetUser = await repository.findUserByEmail(input.email);
  if (!targetUser) {
    throw new HTTPException(404, { message: "No user found with that email" });
  }

  const existingMembership = await repository.findMembership(teamId, targetUser.id);
  if (existingMembership) {
    throw new HTTPException(409, { message: "User is already a member of this team" });
  }

  await repository.addTeamMember(teamId, targetUser.id, role);

  return { user_id: targetUser.id, email: targetUser.email, name: targetUser.name, role };
}

// Only an owner may change member roles. This intentionally also blocks
// changing your own role (even for an owner) — since a solo owner
// self-demoting is already covered by the last-owner check below, the extra
// self-change block just keeps the rule simple/consistent ("ask someone
// else to change your role") rather than special-casing "self-change is
// fine unless you're the last owner".
export async function updateMemberRole(
  teamId: string,
  requestingUserId: string,
  targetUserId: string,
  newRole: TeamRole,
): Promise<{ user_id: string; role: TeamRole }> {
  const requesterMembership = await repository.findMembership(teamId, requestingUserId);
  if (!requesterMembership) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  if (requesterMembership.role !== "owner") {
    throw new HTTPException(403, { message: "Only an owner can change member roles" });
  }

  if (requestingUserId === targetUserId) {
    throw new HTTPException(403, { message: "You cannot change your own role" });
  }

  const targetMembership = await repository.findMembership(teamId, targetUserId);
  if (!targetMembership) {
    throw new HTTPException(404, { message: "Member not found" });
  }

  if (targetMembership.role === "owner" && newRole !== "owner") {
    const owners = await repository.countOwners(teamId);
    if (owners <= 1) {
      throw new HTTPException(409, { message: "Cannot demote the last remaining owner" });
    }
  }

  const updated = await repository.updateMemberRole(teamId, targetUserId, newRole);

  return { user_id: updated.user_id, role: updated.role };
}

export async function removeMember(
  teamId: string,
  requestingUserId: string,
  targetUserId: string,
): Promise<void> {
  const requesterMembership = await repository.findMembership(teamId, requestingUserId);
  if (!requesterMembership) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const targetMembership = await repository.findMembership(teamId, targetUserId);
  if (!targetMembership) {
    throw new HTTPException(404, { message: "Member not found" });
  }

  const isSelf = requestingUserId === targetUserId;

  if (targetMembership.role === "owner") {
    const owners = await repository.countOwners(teamId);
    if (owners <= 1) {
      throw new HTTPException(409, {
        message: "Cannot remove the last remaining owner — promote another member first",
      });
    }
    if (!isSelf && requesterMembership.role !== "owner") {
      throw new HTTPException(403, { message: "Only an owner can remove another owner" });
    }
  } else if (targetMembership.role === "admin") {
    if (!isSelf && requesterMembership.role !== "owner") {
      throw new HTTPException(403, { message: "Only an owner can remove an admin" });
    }
  } else if (!isSelf && requesterMembership.role === "member") {
    throw new HTTPException(403, { message: "Only an owner or admin can remove a member" });
  }

  await repository.removeMember(teamId, targetUserId);
}
