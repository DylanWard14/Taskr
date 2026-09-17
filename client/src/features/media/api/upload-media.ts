import { apiFetch } from '../../../lib/api-client'
import type { Media, MediaTarget } from '../types'

export type UploadMediaInput = MediaTarget & { file: File }

// Builds the multipart body the server's POST /media/upload expects:
// exactly one of taskId/commentId, plus the file itself. Passing a FormData
// body to apiFetch skips the default JSON Content-Type header so the
// browser can set its own multipart boundary (see lib/api-client.ts).
export function uploadMedia(input: UploadMediaInput): Promise<Media> {
  const formData = new FormData()
  formData.append('file', input.file)
  if (input.taskId) {
    formData.append('taskId', input.taskId)
  } else {
    formData.append('commentId', input.commentId as string)
  }

  return apiFetch('/media/upload', { method: 'POST', body: formData })
}
