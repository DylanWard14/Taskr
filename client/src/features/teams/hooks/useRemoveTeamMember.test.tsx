import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useRemoveTeamMember } from './useRemoveTeamMember'
import { teamsKeys } from './query-keys'

const { removeTeamMemberMock } = vi.hoisted(() => ({ removeTeamMemberMock: vi.fn() }))

vi.mock('../api/remove-team-member', () => ({
  removeTeamMember: removeTeamMemberMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useRemoveTeamMember', () => {
  beforeEach(() => {
    removeTeamMemberMock.mockReset()
  })

  it('removes a member and invalidates both that team members query and the teams list', async () => {
    removeTeamMemberMock.mockResolvedValue(undefined)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRemoveTeamMember('team-1'), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate('u2')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(removeTeamMemberMock).toHaveBeenCalledWith('team-1', 'u2')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teamsKeys.members('team-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teamsKeys.all })
  })
})
