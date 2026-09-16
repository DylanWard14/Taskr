import { apiFetch } from '../../../lib/api-client'
import type { TeamMember } from '../types'

export function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return apiFetch(`/teams/${teamId}/members`)
}
