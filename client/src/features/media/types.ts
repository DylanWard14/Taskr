// Matches the raw snake_case DB columns returned by the server's
// MediaRecord (server/src/modules/media/repository.ts). Media always
// attaches to exactly one of a task or a comment — never both, never
// neither — so exactly one of task_id/comment_id is non-null on any given
// record.
export interface Media {
  id: string
  url: string
  content_type: string
  uploaded_by: string
  task_id: string | null
  comment_id: string | null
  created_at: string
  updated_at: string
}

// Shared "exactly one of taskId or commentId" shape used by list/upload
// requests, mirroring server/src/modules/media/schema.ts's mediaTargetSchema.
export type MediaTarget = { taskId: string; commentId?: undefined } | { commentId: string; taskId?: undefined }
