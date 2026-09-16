import { apiFetch } from '../../../lib/api-client'
import type { AddTeamMemberInput, TeamMember } from '../types'

export function addTeamMember(teamId: string, input: AddTeamMemberInput): Promise<TeamMember> {
  return apiFetch(`/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
