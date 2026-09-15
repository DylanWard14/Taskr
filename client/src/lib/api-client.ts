const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem('taskr_token')
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`)
  }

  return res.json()
}
