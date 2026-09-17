import { useEffect, useState } from 'react'
import { fetchMediaBlob } from '../api/fetch-media-blob'

export interface UseMediaImageUrlResult {
  // An object URL suitable for an <img src>, or null while loading/on error.
  url: string | null
  isLoading: boolean
  // True on any fetch failure — a genuine network error, or a stale 404 if
  // the media was deleted elsewhere in the meantime.
  isError: boolean
}

// Centralizes the "fetch authenticated image bytes, then manage the
// resulting object URL's lifecycle" pattern so every image-rendering
// component (currently just MediaThumbnail) doesn't have to duplicate it.
//
// GET /media/:id/file requires the same Authorization header as every other
// API call, so a plain <img src="/media/:id/file"> can't be used directly —
// the bytes are fetched here as a Blob and exposed via
// URL.createObjectURL, which IS usable as an <img src>. The object URL is
// revoked whenever the id changes or the component unmounts, so it doesn't
// leak memory.
export function useMediaImageUrl(mediaId: string): UseMediaImageUrlResult {
  // Tracks which mediaId a resolved url/error belongs to, rather than
  // resetting url/isLoading/isError with synchronous setState calls at the
  // top of the effect (before the fetch even starts) — those settle purely
  // by comparing against the current mediaId below.
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null)
  const [erroredId, setErroredId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    fetchMediaBlob(mediaId)
      .then((blob) => {
        if (cancelled) {
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setLoaded({ id: mediaId, url: objectUrl })
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setErroredId(mediaId)
      })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [mediaId])

  const url = loaded?.id === mediaId ? loaded.url : null
  const isError = erroredId === mediaId
  const isLoading = !url && !isError

  return { url, isLoading, isError }
}
