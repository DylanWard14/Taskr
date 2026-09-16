import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useTeams } from './useTeams'

const { getTeamsMock } = vi.hoisted(() => ({ getTeamsMock: vi.fn() }))

vi.mock('../api/get-teams', () => ({
  getTeams: getTeamsMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useTeams', () => {
  beforeEach(() => {
    getTeamsMock.mockReset()
  })

  it('returns the teams for the current user', async () => {
    getTeamsMock.mockResolvedValue([{ id: 'team-1', name: 'Engineering' }])

    const { result } = renderHook(() => useTeams(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'team-1', name: 'Engineering' }])
    })
  })
})
