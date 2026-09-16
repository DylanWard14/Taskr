import { apiFetch } from '../../../lib/api-client'
import type { CreateTeamInput, Team } from '../types'

export function createTeam(input: CreateTeamInput): Promise<Team> {
  return apiFetch('/teams', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
