import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useAddTeamMember } from './useAddTeamMember'
import { teamsKeys } from './query-keys'

const { addTeamMemberMock } = vi.hoisted(() => ({ addTeamMemberMock: vi.fn() }))

vi.mock('../api/add-team-member', () => ({
  addTeamMember: addTeamMemberMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useAddTeamMember', () => {
  beforeEach(() => {
    addTeamMemberMock.mockReset()
  })

  it('adds a member and invalidates that team members query', async () => {
    addTeamMemberMock.mockResolvedValue({
      user_id: 'u2',
      email: 'bob@example.com',
      name: 'Bob',
      role: 'member',
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddTeamMember('team-1'), { wrapper: makeWrapper(queryClient) })

    result.current.mutate({ email: 'bob@example.com', role: 'member' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(addTeamMemberMock).toHaveBeenCalledWith('team-1', { email: 'bob@example.com', role: 'member' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teamsKeys.members('team-1') })
  })
})
