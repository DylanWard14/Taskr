import { useEffect, useState } from 'react'
import { getTeams } from '../api/get-teams'
import type { Team } from '../types'

export interface UseTeamsResult {
  teams: Team[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useTeams(): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    getTeams()
      .then((result) => {
        if (!cancelled) {
          setTeams(result)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load teams')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refetch = () => setReloadToken((token) => token + 1)

  return { teams, isLoading, error, refetch }
}
