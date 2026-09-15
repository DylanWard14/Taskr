import { useCallback, useState } from 'react'
import { updateTask } from '../api/update-task'
import type { Task, TaskStatus } from '../types'

export interface UseUpdateTaskStatusResult {
  updateStatus: (taskId: string, status: TaskStatus) => Promise<Task>
  isUpdating: boolean
  error: string | null
}

export function useUpdateTaskStatus(teamId: string | undefined): UseUpdateTaskStatusResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = useCallback(
    async (taskId: string, status: TaskStatus): Promise<Task> => {
      if (!teamId) {
        throw new Error('Cannot update a task without a team id')
      }
      setIsUpdating(true)
      setError(null)
      try {
        return await updateTask(teamId, taskId, { status })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task status')
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [teamId],
  )

  return { updateStatus, isUpdating, error }
}
