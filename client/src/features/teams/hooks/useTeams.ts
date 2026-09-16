import { useQuery } from '@tanstack/react-query'
import { getTeams } from '../api/get-teams'
import { teamsKeys } from './query-keys'

export function useTeams() {
  return useQuery({
    queryKey: teamsKeys.all,
    queryFn: getTeams,
  })
}
