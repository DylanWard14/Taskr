import { listTeamsForUser } from "./repository.js";

export function getTeamsForUser(userId: string) {
  return listTeamsForUser(userId);
}
