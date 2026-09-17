import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useCreateComment } from './useCreateComment'
import { commentsKeys } from './query-keys'

const { createCommentMock } = vi.hoisted(() => ({ createCommentMock: vi.fn() }))

vi.mock('../api/create-comment', () => ({
  createComment: createCommentMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateComment', () => {
  beforeEach(() => {
    createCommentMock.mockReset()
  })

  it('creates a comment and invalidates that task comments query', async () => {
    createCommentMock.mockResolvedValue({ id: 'c1' })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateComment('t1'), { wrapper: makeWrapper(queryClient) })

    result.current.mutate({ body: 'Nice work' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(createCommentMock).toHaveBeenCalledWith('t1', { body: 'Nice work' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: commentsKeys.list('t1') })
  })
})
