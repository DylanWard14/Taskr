import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { currentUserQueryKey, useAuth } from './useCurrentUser'
import { TOKEN_STORAGE_KEY } from '../../../lib/constants'
import type { User } from '../types'

const { getMeMock } = vi.hoisted(() => ({ getMeMock: vi.fn() }))

vi.mock('../api/get-me', () => ({
  getMe: getMeMock,
}))

const testUser: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' }

function renderUseAuth(queryClient: QueryClient) {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return renderHook(() => useAuth(), { wrapper })
}

describe('useAuth / useCurrentUser', () => {
  beforeEach(() => {
    localStorage.clear()
    getMeMock.mockReset()
  })

  it('reports logged out with no user when there is no stored token', async () => {
    const queryClient = new QueryClient()
    const { result } = renderUseAuth(queryClient)

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false)
    })
    expect(result.current.user).toBeNull()
    expect(getMeMock).not.toHaveBeenCalled()
  })

  it('re-syncs across tabs when the auth token changes in localStorage', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryKey, testUser)
    const { result } = renderUseAuth(queryClient)

    await waitFor(() => {
      expect(result.current.user).toEqual(testUser)
    })

    // Simulate another tab logging out: it clears the token and a `storage`
    // event fires in this tab (the browser never fires it in the tab that
    // made the change, but jsdom lets us dispatch it manually here).
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.dispatchEvent(
      new StorageEvent('storage', { key: TOKEN_STORAGE_KEY, newValue: null, oldValue: 'a-token' }),
    )

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false)
    })
    expect(result.current.user).toBeNull()
  })

  it('ignores storage events for unrelated keys', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryKey, testUser)
    const { result } = renderUseAuth(queryClient)

    await waitFor(() => {
      expect(result.current.user).toEqual(testUser)
    })

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-key', newValue: 'x' }))

    // Give any (incorrect) async invalidation a chance to run before asserting nothing changed.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.user).toEqual(testUser)
    expect(getMeMock).not.toHaveBeenCalled()
  })
})
