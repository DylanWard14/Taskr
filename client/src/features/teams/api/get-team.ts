import { apiFetch } from '../../../lib/api-client'
import type { Team } from '../types'

export function getTeam(teamId: string): Promise<Team> {
  return apiFetch(`/teams/${teamId}`)
}
