import { apiFetchBlob } from '../../../lib/api-client'

// GET /media/:id/file requires the same Authorization header as every other
// endpoint, so it can't be used directly as an <img src>. Callers turn the
// resulting Blob into an object URL (see hooks/useMediaImageUrl.ts).
export function fetchMediaBlob(mediaId: string): Promise<Blob> {
  return apiFetchBlob(`/media/${mediaId}/file`)
}
