import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createAppRouter } from './routes'
import type { User } from '../features/auth/types'

const { getMeMock } = vi.hoisted(() => ({ getMeMock: vi.fn() }))

vi.mock('../features/auth/api/get-me', () => ({
  getMe: getMeMock,
}))

const testUser: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' }

function renderAppAt(path: string) {
  const queryClient = new QueryClient()
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createAppRouter(queryClient, history)
  return render(<App queryClient={queryClient} router={router} />)
}

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear()
    getMeMock.mockReset()
  })

  it('redirects an unauthenticated visitor from the protected route to /login', async () => {
    renderAppAt('/')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    })
  })

  it('shows the protected content for an authenticated user', async () => {
    localStorage.setItem('taskr_token', 'valid-token')
    getMeMock.mockResolvedValue(testUser)

    renderAppAt('/')

    await waitFor(() => {
      expect(screen.getByText(/signed in as ada lovelace/i)).toBeInTheDocument()
    })
  })

  it('redirects an authenticated user away from /login to the protected route', async () => {
    localStorage.setItem('taskr_token', 'valid-token')
    getMeMock.mockResolvedValue(testUser)

    renderAppAt('/login')

    await waitFor(() => {
      expect(screen.getByText(/signed in as ada lovelace/i)).toBeInTheDocument()
    })
  })

  it('redirects an authenticated user away from /signup to the protected route', async () => {
    localStorage.setItem('taskr_token', 'valid-token')
    getMeMock.mockResolvedValue(testUser)

    renderAppAt('/signup')

    await waitFor(() => {
      expect(screen.getByText(/signed in as ada lovelace/i)).toBeInTheDocument()
    })
  })
})
