import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createAppRouter } from './routes'
import type { User } from '../features/auth/types'
import type { Team } from '../features/teams/types'

const { getMeMock, getTeamMock, getTeamMembersMock } = vi.hoisted(() => ({
  getMeMock: vi.fn(),
  getTeamMock: vi.fn(),
  getTeamMembersMock: vi.fn(),
}))

vi.mock('../features/auth/api/get-me', () => ({
  getMe: getMeMock,
}))

vi.mock('../features/teams/api/get-team', () => ({
  getTeam: getTeamMock,
}))

vi.mock('../features/teams/api/get-team-members', () => ({
  getTeamMembers: getTeamMembersMock,
}))

const testUser: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' }
const testTeam: Team = { id: 'team-1', name: 'Engineering' }

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
    getTeamMock.mockReset()
    getTeamMembersMock.mockReset()
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

  it('redirects an unauthenticated visitor from /teams/$teamId to /login', async () => {
    renderAppAt('/teams/team-1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    })
  })

  it('shows the authenticated shell and the team page for an authenticated member', async () => {
    localStorage.setItem('taskr_token', 'valid-token')
    getMeMock.mockResolvedValue(testUser)
    getTeamMock.mockResolvedValue(testTeam)
    getTeamMembersMock.mockResolvedValue([
      { user_id: testUser.id, email: testUser.email, name: testUser.name, role: 'owner' },
    ])

    renderAppAt('/teams/team-1')

    await waitFor(() => {
      // The persistent authenticated shell renders alongside the team page.
      expect(screen.getByText(/signed in as ada lovelace/i)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /engineering/i })).toBeInTheDocument()
    })
  })
})
