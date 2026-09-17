import { apiFetch } from '../../../lib/api-client'
import type { Comment, CreateCommentInput } from '../types'

export function createComment(taskId: string, input: CreateCommentInput): Promise<Comment> {
  return apiFetch(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
