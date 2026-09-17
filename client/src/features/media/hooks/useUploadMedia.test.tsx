import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useUploadMedia } from './useUploadMedia'

const { uploadMediaMock } = vi.hoisted(() => ({ uploadMediaMock: vi.fn() }))

vi.mock('../api/upload-media', () => ({
  uploadMedia: uploadMediaMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useUploadMedia', () => {
  beforeEach(() => {
    uploadMediaMock.mockReset()
  })

  it('uploads a file scoped to a task target', async () => {
    const file = new File(['bytes'], 'a.png', { type: 'image/png' })
    uploadMediaMock.mockResolvedValue({
      id: 'm1',
      url: '/media/m1/file',
      content_type: 'image/png',
      uploaded_by: 'u1',
      task_id: 't1',
      comment_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    const { result } = renderHook(() => useUploadMedia({ taskId: 't1' }), { wrapper })
    result.current.mutate(file)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(uploadMediaMock).toHaveBeenCalledWith({ taskId: 't1', file })
  })

  it('uploads a file scoped to a comment target', async () => {
    const file = new File(['bytes'], 'a.png', { type: 'image/png' })
    uploadMediaMock.mockResolvedValue({
      id: 'm1',
      url: '/media/m1/file',
      content_type: 'image/png',
      uploaded_by: 'u1',
      task_id: null,
      comment_id: 'c1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    const { result } = renderHook(() => useUploadMedia({ commentId: 'c1' }), { wrapper })
    result.current.mutate(file)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(uploadMediaMock).toHaveBeenCalledWith({ commentId: 'c1', file })
  })
})
