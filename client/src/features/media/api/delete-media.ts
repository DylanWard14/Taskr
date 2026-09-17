import { apiFetch } from '../../../lib/api-client'

export function deleteMedia(mediaId: string): Promise<void> {
  return apiFetch(`/media/${mediaId}`, { method: 'DELETE' })
}
