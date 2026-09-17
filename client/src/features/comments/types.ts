// Matches the raw snake_case DB columns returned by the server's
// CommentRecord (server/src/modules/comments/repository.ts) — the API
// response shape is NOT the same as the request body shape below, mirroring
// the asymmetry already established by features/tasks/types.ts's Task.
export interface Comment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
}

// Matches server/src/modules/comments/schema.ts's createCommentSchema.
// mediaIds is intentionally omitted — the server accepts but currently
// ignores it (deferred to the media PR), so the client doesn't send it.
export interface CreateCommentInput {
  body: string
}
