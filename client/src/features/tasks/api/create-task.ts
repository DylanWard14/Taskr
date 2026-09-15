import { apiFetch } from '../../../lib/api-client'
import type { Task, TaskPriority, TaskStatus } from '../types'

export interface CreateTaskInput {
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
  priority?: TaskPriority
  status?: TaskStatus
}

export function createTask(teamId: string, input: CreateTaskInput): Promise<Task> {
  return apiFetch(`/teams/${teamId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
