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

// Shared by apiFetch and apiFetchBlob: attaches the bearer token (as every
// endpoint requires auth) and issues the request, throwing an ApiError with
// the server-provided message/details on a non-2xx response. Callers decide
// how to read the body (JSON vs. blob) on success.
async function request(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  // FormData bodies (e.g. the media upload's multipart request) must NOT get
  // a manually-set Content-Type — the browser needs to set its own
  // `multipart/form-data; boundary=...` value, which we can't replicate
  // ourselves. All other (JSON) callers keep getting the header as before.
  const isFormData = init?.body instanceof FormData
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

  return res
}

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await request(path, init)

  // No-content responses (e.g. 204 from a DELETE) have no body to parse —
  // calling res.json() on them would throw.
  if (res.status === 204) {
    return undefined
  }

  return res.json()
}

// For endpoints that stream raw bytes rather than JSON (currently just
// GET /media/:id/file) — e.g. an authenticated <img>, which can't attach an
// Authorization header itself, needs the bytes fetched here and turned into
// an object URL by the caller (see features/media/hooks/useMediaImageUrl).
export async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const res = await request(path, init)
  return res.blob()
}
