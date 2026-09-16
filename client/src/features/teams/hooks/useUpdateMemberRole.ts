import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMemberRole } from '../api/update-member-role'
import { teamsKeys } from './query-keys'
import type { UpdatableTeamRole } from '../types'

export interface UpdateMemberRoleVariables {
  userId: string
  role: UpdatableTeamRole
}

export function useUpdateMemberRole(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: UpdateMemberRoleVariables) =>
      updateMemberRole(teamId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) })
    },
  })
}
