import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useComments } from './useComments'

const { getCommentsMock } = vi.hoisted(() => ({ getCommentsMock: vi.fn() }))

vi.mock('../api/get-comments', () => ({
  getComments: getCommentsMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useComments', () => {
  beforeEach(() => {
    getCommentsMock.mockReset()
  })

  it('fetches comments for the given task', async () => {
    getCommentsMock.mockResolvedValue([
      {
        id: 'c1',
        task_id: 't1',
        author_id: 'u1',
        body: 'Hello',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    const { result } = renderHook(() => useComments('t1'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
    expect(getCommentsMock).toHaveBeenCalledWith('t1')
  })

  it('does not fetch when disabled (e.g. deferred until a dialog is opened)', async () => {
    getCommentsMock.mockResolvedValue([])

    const { result } = renderHook(() => useComments('t1', { enabled: false }), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getCommentsMock).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('does not fetch with an empty taskId', async () => {
    getCommentsMock.mockResolvedValue([])

    const { result } = renderHook(() => useComments(''), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getCommentsMock).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
