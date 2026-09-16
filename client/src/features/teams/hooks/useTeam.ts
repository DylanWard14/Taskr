import { useQuery } from '@tanstack/react-query'
import { getTeam } from '../api/get-team'
import { teamsKeys } from './query-keys'

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: teamsKeys.detail(teamId),
    queryFn: () => getTeam(teamId),
    enabled: Boolean(teamId),
    retry: false,
  })
}
