import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removeTeamMember } from '../api/remove-team-member'
import { teamsKeys } from './query-keys'

export function useRemoveTeamMember(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => removeTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) })
      // Leaving a team (self-removal) changes the caller's team list too.
      queryClient.invalidateQueries({ queryKey: teamsKeys.all })
    },
  })
}
