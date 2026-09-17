import { apiFetch } from '../../../lib/api-client'

export function deleteComment(taskId: string, commentId: string): Promise<void> {
  return apiFetch(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' })
}
