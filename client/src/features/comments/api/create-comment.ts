import { apiFetch } from '../../../lib/api-client'
import type { Comment, CreateCommentInput } from '../types'

interface RawComment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
}

function toComment(raw: RawComment): Comment {
  return {
    id: raw.id,
    taskId: raw.task_id,
    authorId: raw.author_id,
    body: raw.body,
    createdAt: raw.created_at,
  }
}

export async function createComment(taskId: string, input: CreateCommentInput): Promise<Comment> {
  const raw = (await apiFetch(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })) as RawComment
  return toComment(raw)
}
