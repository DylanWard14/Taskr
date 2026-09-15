import { db } from "../../lib/db.js";

export function listTasksForTeam(teamId: string) {
  return db("tasks").where({ team_id: teamId }).select("*");
}
