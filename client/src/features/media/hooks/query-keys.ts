import type { MediaTarget } from '../types'

// Centralized TanStack Query keys for the media feature, so the list query
// and the mutations that need to invalidate it stay in sync. Keyed by
// target (task or comment) so a task's attachments and a comment's
// attachments never collide.
export const mediaKeys = {
  list: (target: MediaTarget) =>
    target.taskId ? (['tasks', target.taskId, 'media'] as const) : (['comments', target.commentId, 'media'] as const),
}
