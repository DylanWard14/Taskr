import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ApiError } from './api-client'
import { TOKEN_STORAGE_KEY } from './constants'

function jsonResponse(body: unknown, status: number, ok: boolean) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

function nonJsonResponse(status: number, ok: boolean) {
  return {
    ok,
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
  } as Response
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves with the parsed JSON body on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }, 200, true))

    const result = await apiFetch('/some/path')

    expect(result).toEqual({ ok: true })
  })

  it('attaches the stored bearer token when present', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 200, true))

    await apiFetch('/some/path')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer a-token')
  })

  it('throws an ApiError using the server-provided error and details on a JSON error body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'Invalid request body', details: { fieldErrors: { email: ['Required'] } } }, 400, false),
    )

    await expect(apiFetch('/auth/signup')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Invalid request body',
      status: 400,
      details: { fieldErrors: { email: ['Required'] } },
    })
  })

  it('throws an ApiError instance on a JSON error body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Invalid email or password' }, 401, false))

    await expect(apiFetch('/auth/login')).rejects.toBeInstanceOf(ApiError)
  })

  it('falls back to a generic message and status when the error body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(nonJsonResponse(500, false))

    const error = await apiFetch('/auth/me').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
    expect((error as ApiError).message).toBe('Request to /auth/me failed with 500')
    expect((error as ApiError).details).toBeUndefined()
  })
})
