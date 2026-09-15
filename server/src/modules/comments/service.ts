import { listCommentsForTask } from "./repository.js";

export function getCommentsForTask(taskId: string) {
  return listCommentsForTask(taskId);
}
