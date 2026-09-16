import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask } from '../api/create-task'
import { tasksKeys } from './query-keys'
import type { CreateTaskInput } from '../types'

export function useCreateTask(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.list(teamId) })
    },
  })
}
