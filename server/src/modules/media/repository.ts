import { db } from "../../lib/db.js";

export interface MediaRecord {
  id: string;
  url: string;
  content_type: string;
  uploaded_by: string;
  task_id: string | null;
  comment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export function createMedia(params: {
  url: string;
  contentType: string;
  uploadedBy: string;
  taskId?: string;
  commentId?: string;
}): Promise<MediaRecord> {
  return db("media")
    .insert({
      url: params.url,
      content_type: params.contentType,
      uploaded_by: params.uploadedBy,
      task_id: params.taskId ?? null,
      comment_id: params.commentId ?? null,
    })
    .returning("*")
    .then((rows) => rows[0]);
}
