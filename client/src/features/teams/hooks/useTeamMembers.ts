import { useQuery } from '@tanstack/react-query'
import { getTeamMembers } from '../api/get-team-members'
import { teamsKeys } from './query-keys'

export interface UseTeamMembersOptions {
  enabled?: boolean
}

export function useTeamMembers(teamId: string, options: UseTeamMembersOptions = {}) {
  return useQuery({
    queryKey: teamsKeys.members(teamId),
    queryFn: () => getTeamMembers(teamId),
    enabled: Boolean(teamId) && (options.enabled ?? true),
  })
}
