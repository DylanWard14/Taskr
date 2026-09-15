import { db } from "../../lib/db.js";

export function listCommentsForTask(taskId: string) {
  return db("comments").where({ task_id: taskId }).select("*");
}
