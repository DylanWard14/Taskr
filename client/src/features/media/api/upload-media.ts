import type { Media } from '../types'

// Note: this doesn't use the shared `apiFetch` helper because it always sets
// a `Content-Type: application/json` header, which conflicts with a
// multipart/form-data upload (the browser needs to set that header itself,
// including the multipart boundary).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export interface UploadMediaParams {
  file: File
  taskId?: string
  commentId?: string
}

interface RawMedia {
  id: string
  url: string
  content_type: string
  uploaded_by: string
  task_id: string | null
  comment_id: string | null
  created_at: string
}

function toMedia(raw: RawMedia): Media {
  return {
    id: raw.id,
    url: raw.url,
    contentType: raw.content_type,
    uploadedBy: raw.uploaded_by,
    taskId: raw.task_id ?? undefined,
    commentId: raw.comment_id ?? undefined,
    createdAt: raw.created_at,
  }
}

export async function uploadMedia({ file, taskId, commentId }: UploadMediaParams): Promise<Media> {
  const token = localStorage.getItem('taskr_token')
  const formData = new FormData()
  formData.set('file', file)
  if (taskId) formData.set('taskId', taskId)
  if (commentId) formData.set('commentId', commentId)

  const res = await fetch(`${API_BASE_URL}/media/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Upload failed with ${res.status}`)
  }

  return toMedia((await res.json()) as RawMedia)
}
