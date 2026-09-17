import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMediaImageUrl } from './useMediaImageUrl'

const { fetchMediaBlobMock } = vi.hoisted(() => ({ fetchMediaBlobMock: vi.fn() }))

vi.mock('../api/fetch-media-blob', () => ({
  fetchMediaBlob: fetchMediaBlobMock,
}))

describe('useMediaImageUrl', () => {
  const createObjectURLMock = vi.fn(() => 'blob:mock-url')
  const revokeObjectURLMock = vi.fn()

  beforeEach(() => {
    fetchMediaBlobMock.mockReset()
    createObjectURLMock.mockClear()
    revokeObjectURLMock.mockClear()
    // jsdom doesn't implement these — stub them so the object-URL lifecycle
    // can be exercised for real.
    URL.createObjectURL = createObjectURLMock
    URL.revokeObjectURL = revokeObjectURLMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in a loading state, then resolves to an object URL on success', async () => {
    const blob = new Blob(['bytes'], { type: 'image/png' })
    fetchMediaBlobMock.mockResolvedValue(blob)

    const { result } = renderHook(() => useMediaImageUrl('m1'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.url).toBeNull()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.url).toBe('blob:mock-url')
    expect(result.current.isError).toBe(false)
    expect(createObjectURLMock).toHaveBeenCalledWith(blob)
  })

  it('sets isError on a fetch failure (e.g. a stale 404 or network error)', async () => {
    fetchMediaBlobMock.mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useMediaImageUrl('m1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.url).toBeNull()
  })

  it('revokes the object URL on unmount', async () => {
    const blob = new Blob(['bytes'], { type: 'image/png' })
    fetchMediaBlobMock.mockResolvedValue(blob)

    const { result, unmount } = renderHook(() => useMediaImageUrl('m1'))

    await waitFor(() => {
      expect(result.current.url).toBe('blob:mock-url')
    })

    unmount()

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })

  it('revokes the previous object URL and refetches when the media id changes', async () => {
    const blob = new Blob(['bytes'], { type: 'image/png' })
    fetchMediaBlobMock.mockResolvedValue(blob)

    const { result, rerender } = renderHook(({ id }) => useMediaImageUrl(id), {
      initialProps: { id: 'm1' },
    })

    await waitFor(() => {
      expect(result.current.url).toBe('blob:mock-url')
    })

    rerender({ id: 'm2' })

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
    await waitFor(() => {
      expect(fetchMediaBlobMock).toHaveBeenCalledWith('m2')
    })
  })
})
