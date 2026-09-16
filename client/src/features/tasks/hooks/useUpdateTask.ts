import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '../api/update-task'
import { tasksKeys } from './query-keys'
import type { UpdateTaskInput } from '../types'

export interface UpdateTaskVariables {
  taskId: string
  input: UpdateTaskInput
}

// Backs both general field edits and status-column moves — one mutation,
// one PATCH endpoint, per the server's single updateTaskSchema.
export function useUpdateTask(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: UpdateTaskVariables) => updateTask(teamId, taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.list(teamId) })
    },
  })
}
