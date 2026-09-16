import { TOKEN_STORAGE_KEY } from './constants'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let message = `Request to ${path} failed with ${res.status}`
    let details: unknown
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string') {
        message = body.error
      }
      details = body?.details
    } catch {
      // response body wasn't JSON (or was empty) — fall back to the generic message
    }
    throw new ApiError(message, res.status, details)
  }

  return res.json()
}
