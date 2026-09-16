import { apiFetch } from '../../../lib/api-client'
import type { CreateTaskInput, Task } from '../types'

export function createTask(teamId: string, input: CreateTaskInput): Promise<Task> {
  return apiFetch(`/teams/${teamId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
