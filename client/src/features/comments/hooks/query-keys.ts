// Centralized TanStack Query keys for the comments feature, so the list
// query and the mutations that need to invalidate it stay in sync.
export const commentsKeys = {
  list: (taskId: string) => ['tasks', taskId, 'comments'] as const,
}
