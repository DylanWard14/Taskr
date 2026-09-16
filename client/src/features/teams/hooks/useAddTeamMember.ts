import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addTeamMember } from '../api/add-team-member'
import { teamsKeys } from './query-keys'
import type { AddTeamMemberInput } from '../types'

export function useAddTeamMember(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AddTeamMemberInput) => addTeamMember(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) })
    },
  })
}
