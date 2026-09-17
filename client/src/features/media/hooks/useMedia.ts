import { useQuery } from '@tanstack/react-query'
import { listMedia } from '../api/list-media'
import { mediaKeys } from './query-keys'
import type { MediaTarget } from '../types'

export interface UseMediaOptions {
  // Lets callers (e.g. a TaskCard's Attachments dialog) defer fetching a
  // target's media until it's actually opened, rather than firing a query
  // per card up front — mirrors comments' useComments.
  enabled?: boolean
}

export function useMedia(target: MediaTarget, options: UseMediaOptions = {}) {
  const targetId = target.taskId ?? target.commentId

  return useQuery({
    queryKey: mediaKeys.list(target),
    queryFn: () => listMedia(target),
    enabled: Boolean(targetId) && (options.enabled ?? true),
  })
}
