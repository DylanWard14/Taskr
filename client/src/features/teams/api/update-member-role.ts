import { apiFetch } from '../../../lib/api-client'
import type { TeamRole, UpdatableTeamRole } from '../types'

export function updateMemberRole(
  teamId: string,
  userId: string,
  role: UpdatableTeamRole,
): Promise<{ user_id: string; role: TeamRole }> {
  return apiFetch(`/teams/${teamId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}
