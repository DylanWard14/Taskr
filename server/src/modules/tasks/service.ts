import { listTasksForTeam } from "./repository.js";

export function getTasksForTeam(teamId: string) {
  return listTasksForTeam(teamId);
}
