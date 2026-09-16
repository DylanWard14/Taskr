import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useUpdateMemberRole } from './useUpdateMemberRole'
import { teamsKeys } from './query-keys'

const { updateMemberRoleMock } = vi.hoisted(() => ({ updateMemberRoleMock: vi.fn() }))

vi.mock('../api/update-member-role', () => ({
  updateMemberRole: updateMemberRoleMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateMemberRole', () => {
  beforeEach(() => {
    updateMemberRoleMock.mockReset()
  })

  it('updates a member role and invalidates that team members query', async () => {
    updateMemberRoleMock.mockResolvedValue({ user_id: 'u2', role: 'admin' })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateMemberRole('team-1'), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate({ userId: 'u2', role: 'admin' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(updateMemberRoleMock).toHaveBeenCalledWith('team-1', 'u2', 'admin')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teamsKeys.members('team-1') })
  })
})
