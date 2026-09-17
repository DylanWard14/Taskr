import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, apiFetchBlob, ApiError } from './api-client'
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

function blobResponse(blob: Blob, status: number, ok: boolean) {
  return {
    ok,
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
    blob: () => Promise.resolve(blob),
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

  it('resolves with undefined on a 204 No Content response', async () => {
    vi.mocked(fetch).mockResolvedValue(nonJsonResponse(204, true))

    const result = await apiFetch('/teams/team-1/members/user-1', { method: 'DELETE' })

    expect(result).toBeUndefined()
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

  it('does not set a Content-Type header when the body is FormData, letting the browser set the multipart boundary', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 201, true))
    const formData = new FormData()
    formData.append('file', new Blob(['abc']), 'a.png')

    await apiFetch('/media/upload', { method: 'POST', body: formData })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers['Content-Type']).toBeUndefined()
    expect(init?.body).toBe(formData)
  })

  it('still sets Content-Type: application/json for a regular (non-FormData) body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 200, true))

    await apiFetch('/some/path', { method: 'POST', body: JSON.stringify({ a: 1 }) })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })
})

describe('apiFetchBlob', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves with a Blob on a successful response', async () => {
    const blob = new Blob(['image bytes'], { type: 'image/png' })
    vi.mocked(fetch).mockResolvedValue(blobResponse(blob, 200, true))

    const result = await apiFetchBlob('/media/abc/file')

    expect(result).toBe(blob)
  })

  it('attaches the stored bearer token when present', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    vi.mocked(fetch).mockResolvedValue(blobResponse(new Blob(), 200, true))

    await apiFetchBlob('/media/abc/file')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer a-token')
  })

  it('throws an ApiError using the server-provided message on a non-2xx response (e.g. a stale 404)', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Media not found' }, 404, false))

    await expect(apiFetchBlob('/media/abc/file')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Media not found',
      status: 404,
    })
  })
})
