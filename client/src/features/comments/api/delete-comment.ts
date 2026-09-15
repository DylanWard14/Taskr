// Note: this doesn't use the shared `apiFetch` helper because it always
// parses the response as JSON, and a successful delete responds 204 with no
// body.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  const token = localStorage.getItem('taskr_token')
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error(`Request to delete comment failed with ${res.status}`)
  }
}
