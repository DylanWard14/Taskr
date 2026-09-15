import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeams } from './useTeams'
import { getTeams } from '../api/get-teams'

vi.mock('../api/get-teams')

const mockGetTeams = vi.mocked(getTeams)

describe('useTeams', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mockGetTeams.mockReset()
  })

  it('starts in a loading state and resolves with the fetched teams', async () => {
    mockGetTeams.mockResolvedValue([{ id: 'team-1', name: 'Team One' }])

    const { result } = renderHook(() => useTeams())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.teams).toEqual([{ id: 'team-1', name: 'Team One' }])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message when the request fails', async () => {
    mockGetTeams.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useTeams())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('network error')
    expect(result.current.teams).toEqual([])
  })

  it('refetch triggers another call to getTeams', async () => {
    mockGetTeams.mockResolvedValue([{ id: 'team-1', name: 'Team One' }])

    const { result } = renderHook(() => useTeams())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetTeams).toHaveBeenCalledTimes(1)

    result.current.refetch()

    await waitFor(() => expect(mockGetTeams).toHaveBeenCalledTimes(2))
  })
})
