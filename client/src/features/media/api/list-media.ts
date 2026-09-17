import { apiFetch } from '../../../lib/api-client'
import type { Media, MediaTarget } from '../types'

export function listMedia(target: MediaTarget): Promise<Media[]> {
  const params = new URLSearchParams(
    target.taskId ? { taskId: target.taskId } : { commentId: target.commentId as string },
  )
  return apiFetch(`/media?${params.toString()}`)
}
