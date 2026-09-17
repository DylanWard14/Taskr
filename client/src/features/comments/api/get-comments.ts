import { apiFetch } from '../../../lib/api-client'
import type { Comment } from '../types'

export function getComments(taskId: string): Promise<Comment[]> {
  return apiFetch(`/tasks/${taskId}/comments`)
}

