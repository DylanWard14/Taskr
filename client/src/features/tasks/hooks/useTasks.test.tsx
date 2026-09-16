import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useTasks } from './useTasks'

const { getTasksMock } = vi.hoisted(() => ({ getTasksMock: vi.fn() }))

vi.mock('../api/get-tasks', () => ({
  getTasks: getTasksMock,
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useTasks', () => {
  beforeEach(() => {
    getTasksMock.mockReset()
  })

  it('fetches tasks for the given team', async () => {
    getTasksMock.mockResolvedValue([
      {
        id: 't1',
        team_id: 'team-1',
        title: 'Do the thing',
        description: null,
        status: 'todo',
        priority: 'medium',
        assignee_id: null,
        created_by: 'u1',
        due_date: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    const { result } = renderHook(() => useTasks('team-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
    expect(getTasksMock).toHaveBeenCalledWith('team-1')
  })

  it('does not fetch with an empty teamId', async () => {
    getTasksMock.mockResolvedValue([])

    const { result } = renderHook(() => useTasks(''), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getTasksMock).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
