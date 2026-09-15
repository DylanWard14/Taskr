import { apiFetch } from '../../../lib/api-client'
import type { Team } from '../types'

export function getTeams(): Promise<Team[]> {
  return apiFetch('/teams')
}
