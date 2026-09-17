import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useMedia } from './useMedia'

const { listMediaMock } = vi.hoisted(() => ({ listMediaMock: vi.fn() }))

vi.mock('../api/list-media', () => ({
  listMedia: listMediaMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useMedia', () => {
  beforeEach(() => {
    listMediaMock.mockReset()
  })

  it('fetches media for a task target', async () => {
    listMediaMock.mockResolvedValue([
      {
        id: 'm1',
        url: '/media/m1/file',
        content_type: 'image/png',
        uploaded_by: 'u1',
        task_id: 't1',
        comment_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    const { result } = renderHook(() => useMedia({ taskId: 't1' }), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
    expect(listMediaMock).toHaveBeenCalledWith({ taskId: 't1' })
  })

  it('fetches media for a comment target', async () => {
    listMediaMock.mockResolvedValue([])

    const { result } = renderHook(() => useMedia({ commentId: 'c1' }), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(listMediaMock).toHaveBeenCalledWith({ commentId: 'c1' })
  })

  it('does not fetch when disabled (e.g. deferred until a dialog is opened)', async () => {
    listMediaMock.mockResolvedValue([])

    const { result } = renderHook(() => useMedia({ taskId: 't1' }, { enabled: false }), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(listMediaMock).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
