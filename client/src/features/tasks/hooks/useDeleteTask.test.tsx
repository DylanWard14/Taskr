import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useDeleteTask } from './useDeleteTask'
import { tasksKeys } from './query-keys'

const { deleteTaskMock } = vi.hoisted(() => ({ deleteTaskMock: vi.fn() }))

vi.mock('../api/delete-task', () => ({
  deleteTask: deleteTaskMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDeleteTask', () => {
  beforeEach(() => {
    deleteTaskMock.mockReset()
  })

  it('deletes a task and invalidates that team tasks query', async () => {
    deleteTaskMock.mockResolvedValue(undefined)
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteTask('team-1'), { wrapper: makeWrapper(queryClient) })

    result.current.mutate('t1')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(deleteTaskMock).toHaveBeenCalledWith('team-1', 't1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tasksKeys.list('team-1') })
  })
})
