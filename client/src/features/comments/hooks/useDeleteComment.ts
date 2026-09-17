import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteComment } from '../api/delete-comment'
import { commentsKeys } from './query-keys'

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.list(taskId) })
    },
  })
}
