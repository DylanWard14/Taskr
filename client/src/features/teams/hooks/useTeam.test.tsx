import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useTeam } from './useTeam'
import { ApiError } from '../../../lib/api-client'

const { getTeamMock } = vi.hoisted(() => ({ getTeamMock: vi.fn() }))

vi.mock('../api/get-team', () => ({
  getTeam: getTeamMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useTeam', () => {
  beforeEach(() => {
    getTeamMock.mockReset()
  })

  it('returns the requested team', async () => {
    getTeamMock.mockResolvedValue({ id: 'team-1', name: 'Engineering' })

    const { result } = renderHook(() => useTeam('team-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 'team-1', name: 'Engineering' })
    })
    expect(getTeamMock).toHaveBeenCalledWith('team-1')
  })

  it('surfaces a 404 ApiError (not a member, or team does not exist)', async () => {
    getTeamMock.mockRejectedValue(new ApiError('Team not found', 404))

    const { result } = renderHook(() => useTeam('missing-team'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect((result.current.error as ApiError).status).toBe(404)
  })
})
