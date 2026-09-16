import { useEffect } from 'react'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMe } from '../api/get-me'
import { ApiError } from '../../../lib/api-client'
import { TOKEN_STORAGE_KEY } from '../../../lib/constants'
import type { User } from '../types'

export const currentUserQueryKey = ['auth', 'me'] as const

async function fetchCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) {
    return null
  }

  try {
    return await getMe()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // Stale/invalid token — treat as logged out rather than surfacing an error.
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    throw err
  }
}

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  })
}

/**
 * Re-syncs the ['auth','me'] query whenever the auth token changes in
 * localStorage from another browser tab (e.g. that tab logged out or logged
 * in). The native `storage` event only fires in *other* tabs/windows, not the
 * one that made the change, so this is purely a cross-tab consistency fix —
 * same-tab session changes already go through queryClient.setQueryData in
 * useLogin/useSignup/useLogout.
 */
function useSyncCurrentUserAcrossTabs() {
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === TOKEN_STORAGE_KEY) {
        queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [queryClient])
}

export function useCurrentUser() {
  useSyncCurrentUserAcrossTabs()
  return useQuery(currentUserQueryOptions())
}

export function useAuth() {
  const query = useCurrentUser()
  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data),
  }
}
