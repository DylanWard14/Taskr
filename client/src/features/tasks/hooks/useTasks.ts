import { useCallback, useEffect, useState } from 'react'
import { getTasks } from '../api/get-tasks'
import type { Task } from '../types'

export interface UseTasksResult {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useTasks(teamId: string | undefined): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!teamId) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getTasks(teamId)
      .then((result) => {
        if (!cancelled) setTasks(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tasks')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, version])

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  return { tasks, isLoading, error, refetch }
}
