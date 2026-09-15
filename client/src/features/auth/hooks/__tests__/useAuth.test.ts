import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../useAuth'
import * as loginApi from '../../api/login'

vi.mock('../../api/login', () => ({
  login: vi.fn(),
}))

const loginMock = vi.mocked(loginApi.login)

describe('useAuth', () => {
  beforeEach(() => {
    loginMock.mockReset()
    localStorage.clear()
  })

  it('starts unauthenticated when there is no stored session', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logs in, stores the session, and exposes the user', async () => {
    loginMock.mockResolvedValue({
      token: 'token-123',
      user: { id: '1', email: 'jane@example.com', name: 'Jane Doe' },
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('jane@example.com', 'supersecret')
    })

    expect(loginMock).toHaveBeenCalledWith('jane@example.com', 'supersecret')
    expect(result.current.user).toEqual({ id: '1', email: 'jane@example.com', name: 'Jane Doe' })
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorage.getItem('taskr_token')).toBe('token-123')
  })

  it('surfaces an error and stays unauthenticated when login fails', async () => {
    loginMock.mockRejectedValue(new Error('Request to /auth/login failed with 401'))

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await expect(result.current.login('jane@example.com', 'wrong')).rejects.toThrow()
    })

    await waitFor(() => {
      expect(result.current.error).toMatch(/failed with 401/i)
    })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout clears the stored session', async () => {
    loginMock.mockResolvedValue({
      token: 'token-123',
      user: { id: '1', email: 'jane@example.com', name: 'Jane Doe' },
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('jane@example.com', 'supersecret')
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('taskr_token')).toBeNull()
    expect(localStorage.getItem('taskr_user')).toBeNull()
  })
})
