import { apiFetch } from '../../../lib/api-client'
import type { User } from '../types'

export async function getMe(): Promise<User> {
  const { user } = await apiFetch('/auth/me')
  return user
}
