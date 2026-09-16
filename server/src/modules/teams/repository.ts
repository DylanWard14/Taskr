import type { Knex } from "knex";
import { db } from "../../lib/db.js";

export type TeamRole = "owner" | "admin" | "member";

export interface TeamRecord {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMemberRecord {
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMemberWithUser {
  user_id: string;
  email: string;
  name: string;
  role: TeamRole;
}

export interface UserLookup {
  id: string;
  email: string;
  name: string;
}

// Knex query builder or an open transaction — repository functions that need
// to participate in a caller-managed transaction accept this instead of
// hard-coding the module-level `db` instance.
type Executor = Knex | Knex.Transaction;

export function createTeam(name: string, trx: Executor = db) {
  return trx<TeamRecord>("teams")
    .insert({ name })
    .returning("*")
    .then(([team]) => team);
}

export function addTeamMember(teamId: string, userId: string, role: TeamRole, trx: Executor = db) {
  return trx<TeamMemberRecord>("team_members")
    .insert({ team_id: teamId, user_id: userId, role })
    .returning("*")
    .then(([member]) => member);
}

// Creates a team and its owner membership row atomically, so a team can
// never exist without at least one owner.
export function createTeamWithOwner(name: string, ownerId: string): Promise<TeamRecord> {
  return db.transaction(async (trx) => {
    const team = await createTeam(name, trx);
    await addTeamMember(team.id, ownerId, "owner", trx);
    return team;
  });
}

export function findTeamById(id: string) {
  return db<TeamRecord>("teams").where({ id }).first();
}

export function findMembership(teamId: string, userId: string) {
  return db<TeamMemberRecord>("team_members").where({ team_id: teamId, user_id: userId }).first();
}

export function listTeamsForUser(userId: string) {
  return db<TeamRecord>("teams")
    .join("team_members", "teams.id", "team_members.team_id")
    .where("team_members.user_id", userId)
    .select("teams.*");
}

// Joins team_members with users to surface member identity — deliberately
// selects only non-sensitive user columns so password_hash never leaks here.
export function listTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
  return db<TeamMemberWithUser>("team_members")
    .join("users", "team_members.user_id", "users.id")
    .where("team_members.team_id", teamId)
    .select(
      "team_members.user_id as user_id",
      "users.email as email",
      "users.name as name",
      "team_members.role as role",
    );
}

// A narrow, teams-owned lookup of users by email. Deliberately duplicated
// (rather than importing from modules/auth/repository.ts) to keep modules
// decoupled from one another.
export function findUserByEmail(email: string) {
  return db<UserLookup>("users").where({ email }).first("id", "email", "name");
}

export function updateMemberRole(teamId: string, userId: string, role: TeamRole) {
  return db<TeamMemberRecord>("team_members")
    .where({ team_id: teamId, user_id: userId })
    .update({ role, updated_at: db.fn.now() })
    .returning("*")
    .then(([member]) => member);
}

export function removeMember(teamId: string, userId: string) {
  return db<TeamMemberRecord>("team_members").where({ team_id: teamId, user_id: userId }).del();
}

export async function countOwners(teamId: string): Promise<number> {
  const row = await db<TeamMemberRecord>("team_members")
    .where({ team_id: teamId, role: "owner" })
    .count<{ count: string }[]>({ count: "*" })
    .first();
  return Number(row?.count ?? 0);
}
