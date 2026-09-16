import { apiFetch } from '../../../lib/api-client'

export function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return apiFetch(`/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
  })
}
