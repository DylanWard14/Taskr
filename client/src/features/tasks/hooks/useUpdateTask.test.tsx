import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useUpdateTask } from './useUpdateTask'
import { tasksKeys } from './query-keys'

const { updateTaskMock } = vi.hoisted(() => ({ updateTaskMock: vi.fn() }))

vi.mock('../api/update-task', () => ({
  updateTask: updateTaskMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateTask', () => {
  beforeEach(() => {
    updateTaskMock.mockReset()
  })

  it('updates a task (e.g. a status move) and invalidates that team tasks query', async () => {
    updateTaskMock.mockResolvedValue({ id: 't1', status: 'in-progress' })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateTask('team-1'), { wrapper: makeWrapper(queryClient) })

    result.current.mutate({ taskId: 't1', input: { status: 'in-progress' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(updateTaskMock).toHaveBeenCalledWith('team-1', 't1', { status: 'in-progress' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tasksKeys.list('team-1') })
  })
})
