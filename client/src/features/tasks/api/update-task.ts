import { apiFetch } from '../../../lib/api-client'
import type { Task, UpdateTaskInput } from '../types'

// Used both for full field edits and for status-column moves — the server
// exposes a single PATCH endpoint for both (see
// server/src/modules/tasks/schema.ts's updateTaskSchema).
export function updateTask(teamId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
  return apiFetch(`/teams/${teamId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
