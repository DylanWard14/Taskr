import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createComment } from '../api/create-comment'
import { commentsKeys } from './query-keys'
import type { CreateCommentInput } from '../types'

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.list(taskId) })
    },
  })
}
