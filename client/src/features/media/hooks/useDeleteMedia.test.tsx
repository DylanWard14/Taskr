import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useDeleteMedia } from './useDeleteMedia'

const { deleteMediaMock } = vi.hoisted(() => ({ deleteMediaMock: vi.fn() }))

vi.mock('../api/delete-media', () => ({
  deleteMedia: deleteMediaMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useDeleteMedia', () => {
  beforeEach(() => {
    deleteMediaMock.mockReset()
  })

  it('deletes the given media id', async () => {
    deleteMediaMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteMedia({ taskId: 't1' }), { wrapper })
    result.current.mutate('m1')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(deleteMediaMock).toHaveBeenCalledWith('m1')
  })
})
