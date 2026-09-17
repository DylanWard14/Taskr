import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useDeleteComment } from './useDeleteComment'
import { commentsKeys } from './query-keys'

const { deleteCommentMock } = vi.hoisted(() => ({ deleteCommentMock: vi.fn() }))

vi.mock('../api/delete-comment', () => ({
  deleteComment: deleteCommentMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDeleteComment', () => {
  beforeEach(() => {
    deleteCommentMock.mockReset()
  })

  it('deletes a comment and invalidates that task comments query', async () => {
    deleteCommentMock.mockResolvedValue(undefined)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteComment('t1'), { wrapper: makeWrapper(queryClient) })

    result.current.mutate('c1')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(deleteCommentMock).toHaveBeenCalledWith('t1', 'c1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: commentsKeys.list('t1') })
  })
})
