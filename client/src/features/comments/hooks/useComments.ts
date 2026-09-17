import { useQuery } from '@tanstack/react-query'
import { getComments } from '../api/get-comments'
import { commentsKeys } from './query-keys'

export interface UseCommentsOptions {
  // Lets callers (e.g. a TaskCard rendered N-up on the board) defer fetching
  // a task's comments until the user actually opens them, rather than firing
  // a query per card up front.
  enabled?: boolean
}

export function useComments(taskId: string, options: UseCommentsOptions = {}) {
  return useQuery({
    queryKey: commentsKeys.list(taskId),
    queryFn: () => getComments(taskId),
    enabled: Boolean(taskId) && (options.enabled ?? true),
  })
}
