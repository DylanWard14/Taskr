import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTask } from '../api/delete-task'
import { tasksKeys } from './query-keys'

export function useDeleteTask(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(teamId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.list(teamId) })
    },
  })
}
