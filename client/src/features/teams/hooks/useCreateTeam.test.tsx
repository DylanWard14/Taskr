import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useCreateTeam } from './useCreateTeam'
import { teamsKeys } from './query-keys'

const { createTeamMock } = vi.hoisted(() => ({ createTeamMock: vi.fn() }))

vi.mock('../api/create-team', () => ({
  createTeam: createTeamMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateTeam', () => {
  beforeEach(() => {
    createTeamMock.mockReset()
  })

  it('creates a team and invalidates the teams list', async () => {
    createTeamMock.mockResolvedValue({ id: 'team-1', name: 'Engineering' })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateTeam(), { wrapper: makeWrapper(queryClient) })

    result.current.mutate({ name: 'Engineering' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(createTeamMock).toHaveBeenCalledWith({ name: 'Engineering' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teamsKeys.all })
  })
})
