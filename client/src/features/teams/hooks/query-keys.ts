// Centralized TanStack Query keys for the teams feature, so queries and the
// mutations that need to invalidate them stay in sync.
export const teamsKeys = {
  all: ['teams'] as const,
  detail: (teamId: string) => ['teams', teamId] as const,
  members: (teamId: string) => ['teams', teamId, 'members'] as const,
}
