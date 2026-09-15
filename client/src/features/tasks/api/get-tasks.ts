import { apiFetch } from '../../../lib/api-client'
import type { Task } from '../types'

export function getTasks(teamId: string): Promise<Task[]> {
  return apiFetch(`/teams/${teamId}/tasks`)
}
