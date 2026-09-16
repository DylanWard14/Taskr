import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useCreateTask } from './useCreateTask'
import { tasksKeys } from './query-keys'

const { createTaskMock } = vi.hoisted(() => ({ createTaskMock: vi.fn() }))

vi.mock('../api/create-task', () => ({
  createTask: createTaskMock,
}))

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateTask', () => {
  beforeEach(() => {
    createTaskMock.mockReset()
  })

  it('creates a task and invalidates that team tasks query', async () => {
    createTaskMock.mockResolvedValue({ id: 't1' })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateTask('team-1'), { wrapper: makeWrapper(queryClient) })

    result.current.mutate({ title: 'New task' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(createTaskMock).toHaveBeenCalledWith('team-1', { title: 'New task' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tasksKeys.list('team-1') })
  })
})
