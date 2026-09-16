import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { useLogout } from './useLogout'
import { currentUserQueryKey } from './useCurrentUser'
import { TOKEN_STORAGE_KEY } from '../../../lib/constants'
import type { User } from '../types'

const testUser: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' }

function renderUseLogout(queryClient: QueryClient) {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return renderHook(() => useLogout(), { wrapper })
}

describe('useLogout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('clears the stored token', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    const queryClient = new QueryClient()
    const { result } = renderUseLogout(queryClient)

    result.current()

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('clears other cached queries and resets the current-user query to null', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryKey, testUser)
    queryClient.setQueryData(['some', 'other', 'query'], { some: 'data' })

    const { result } = renderUseLogout(queryClient)
    result.current()

    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
    expect(queryClient.getQueryData(['some', 'other', 'query'])).toBeUndefined()
  })
})
