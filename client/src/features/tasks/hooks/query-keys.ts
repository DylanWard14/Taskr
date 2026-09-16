// Centralized TanStack Query keys for the tasks feature, so the list query
// and the mutations that need to invalidate it stay in sync.
export const tasksKeys = {
  list: (teamId: string) => ['teams', teamId, 'tasks'] as const,
}
