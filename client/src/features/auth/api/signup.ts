import { apiFetch } from '../../../lib/api-client'
import type { AuthSession } from '../types'

export interface SignupInput {
  email: string
  password: string
  name: string
}

export function signup(input: SignupInput): Promise<AuthSession> {
  return apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
