import { apiFetch } from '../../../lib/api-client'
import type { AuthSession } from '../types'

export function login(email: string, password: string): Promise<AuthSession> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}
