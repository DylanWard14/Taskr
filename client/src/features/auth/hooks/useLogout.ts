import { useQueryClient } from '@tanstack/react-query'
import { currentUserQueryKey } from './useCurrentUser'
import { TOKEN_STORAGE_KEY } from '../../../lib/constants'

export function useLogout() {
  const queryClient = useQueryClient()

  return () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    // Drop all cached data (it may belong to the now-logged-out user) before
    // marking the session as logged out.
    queryClient.clear()
    queryClient.setQueryData(currentUserQueryKey, null)
  }
}
