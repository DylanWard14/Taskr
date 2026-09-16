import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useTeamMembers } from './useTeamMembers'

const { getTeamMembersMock } = vi.hoisted(() => ({ getTeamMembersMock: vi.fn() }))

vi.mock('../api/get-team-members', () => ({
  getTeamMembers: getTeamMembersMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useTeamMembers', () => {
  beforeEach(() => {
    getTeamMembersMock.mockReset()
  })

  it('fetches members for the given team', async () => {
    getTeamMembersMock.mockResolvedValue([
      { user_id: 'u1', email: 'a@example.com', name: 'Ada', role: 'owner' },
    ])

    const { result } = renderHook(() => useTeamMembers('team-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
    expect(getTeamMembersMock).toHaveBeenCalledWith('team-1')
  })

  it('does not fetch when disabled', async () => {
    getTeamMembersMock.mockResolvedValue([])

    const { result } = renderHook(() => useTeamMembers('team-1', { enabled: false }), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getTeamMembersMock).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
