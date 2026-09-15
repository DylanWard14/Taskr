import { db } from "../../lib/db.js";

export function listTeamsForUser(userId: string) {
  return db("teams")
    .join("team_members", "teams.id", "team_members.team_id")
    .where("team_members.user_id", userId)
    .select("teams.*");
}
