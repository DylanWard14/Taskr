import { apiFetch } from '../../../lib/api-client'
import type { Task, TaskPriority, TaskStatus } from '../types'

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  priority?: TaskPriority
  status?: TaskStatus
}

export function updateTask(teamId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
  return apiFetch(`/teams/${teamId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
