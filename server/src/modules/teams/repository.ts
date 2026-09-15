import { db } from "../../lib/db.js";

export type TeamRole = "owner" | "admin" | "member";

export interface TeamRow {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMemberRow {
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}

export function listTeamsForUser(userId: string): Promise<TeamRow[]> {
  return db("teams")
    .join("team_members", "teams.id", "team_members.team_id")
    .where("team_members.user_id", userId)
    .select("teams.*");
}

export function getTeamById(teamId: string): Promise<TeamRow | undefined> {
  return db("teams").where({ id: teamId }).first();
}

export function getMembership(teamId: string, userId: string): Promise<TeamMemberRow | undefined> {
  return db("team_members").where({ team_id: teamId, user_id: userId }).first();
}

export function findUserById(userId: string): Promise<UserRow | undefined> {
  return db("users").where({ id: userId }).first();
}

export function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return db("users").where({ email }).first();
}

export async function createTeamWithOwner(name: string, ownerId: string): Promise<TeamRow> {
  return db.transaction(async (trx) => {
    const [team] = await trx("teams").insert({ name }).returning("*");
    await trx("team_members").insert({ team_id: team.id, user_id: ownerId, role: "owner" });
    return team as TeamRow;
  });
}

export function addMember(teamId: string, userId: string, role: TeamRole): Promise<unknown> {
  return db("team_members").insert({ team_id: teamId, user_id: userId, role });
}

export function removeMember(teamId: string, userId: string): Promise<unknown> {
  return db("team_members").where({ team_id: teamId, user_id: userId }).del();
}

export async function countOwners(teamId: string): Promise<number> {
  const row = await db("team_members")
    .where({ team_id: teamId, role: "owner" })
    .count<{ count: string | number }>("* as count")
    .first();

  return Number(row?.count ?? 0);
}
