import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeam } from '../api/create-team'
import { teamsKeys } from './query-keys'
import type { CreateTeamInput } from '../types'

export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTeamInput) => createTeam(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.all })
    },
  })
}
