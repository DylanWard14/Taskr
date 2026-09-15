import { apiFetch } from '../../../lib/api-client'

export function deleteTask(teamId: string, taskId: string): Promise<{ success: boolean }> {
  return apiFetch(`/teams/${teamId}/tasks/${taskId}`, {
    method: 'DELETE',
  })
}
