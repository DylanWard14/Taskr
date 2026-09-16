import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login } from '../api/login'
import { currentUserQueryKey } from './useCurrentUser'
import { TOKEN_STORAGE_KEY } from '../../../lib/constants'

export interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: LoginInput) => login(email, password),
    onSuccess: (session) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
      queryClient.setQueryData(currentUserQueryKey, session.user)
    },
  })
}
