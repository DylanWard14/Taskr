import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signup, type SignupInput } from '../api/signup'
import { currentUserQueryKey } from './useCurrentUser'
import { TOKEN_STORAGE_KEY } from '../../../lib/constants'

export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignupInput) => signup(input),
    onSuccess: (session) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
      queryClient.setQueryData(currentUserQueryKey, session.user)
    },
  })
}
