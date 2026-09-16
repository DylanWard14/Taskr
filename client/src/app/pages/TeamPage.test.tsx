import { render, screen } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { createAppRouter } from '../routes'
import { ApiError } from '../../lib/api-client'
import type { User } from '../../features/auth/types'

// TeamPage reads its `teamId` param via the real `teamRoute.useParams()` (see
// app/routes.tsx), so — unlike a page with no params — it must be rendered
// through the actual app router (via App + createAppRouter) rather than a
// simplified standalone route tree, or `useParams()` won't resolve.
const { getMeMock, getTeamMock, getTeamMembersMock, getTasksMock } = vi.hoisted(() => ({
  getMeMock: vi.fn(),
  getTeamMock: vi.fn(),
  getTeamMembersMock: vi.fn(),
  getTasksMock: vi.fn(),
}))

vi.mock('../../features/auth/api/get-me', () => ({
  getMe: getMeMock,
}))

vi.mock('../../features/teams/api/get-team', () => ({
  getTeam: getTeamMock,
}))

vi.mock('../../features/teams/api/get-team-members', () => ({
  getTeamMembers: getTeamMembersMock,
}))

vi.mock('../../features/tasks/api/get-tasks', () => ({
  getTasks: getTasksMock,
}))

const testUser: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' }

function renderTeamPageAt(path: string) {
  const queryClient = new QueryClient()
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createAppRouter(queryClient, history)
  return render(<App queryClient={queryClient} router={router} />)
}

describe('TeamPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('taskr_token', 'valid-token')
    getMeMock.mockReset()
    getTeamMock.mockReset()
    getTeamMembersMock.mockReset()
    getTasksMock.mockReset()
    getMeMock.mockResolvedValue(testUser)
    getTasksMock.mockResolvedValue([])
  })

  it('shows a clear not-found state on a 404 (non-member or nonexistent team)', async () => {
    getTeamMock.mockRejectedValue(new ApiError('Team not found', 404))

    renderTeamPageAt('/teams/missing-team')

    expect(await screen.findByText(/doesn.t exist, or you're not a member/i)).toBeInTheDocument()
    // Confirms the teamId extracted from the URL (not a stale/default value)
    // is what actually gets passed to the API layer.
    expect(getTeamMock).toHaveBeenCalledWith('missing-team')
  })

  it('renders the team name and members for a team the viewer belongs to', async () => {
    getTeamMock.mockResolvedValue({ id: 'team-1', name: 'Engineering' })
    getTeamMembersMock.mockResolvedValue([
      { user_id: testUser.id, email: testUser.email, name: testUser.name, role: 'member' },
      { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner Person', role: 'owner' },
    ])

    renderTeamPageAt('/teams/team-1')

    expect(await screen.findByRole('heading', { name: /engineering/i })).toBeInTheDocument()
    expect(screen.getByText(/owner person/i)).toBeInTheDocument()
    // Viewer's own role here is "member" — no add-member form should render.
    expect(screen.queryByText(/add a member/i)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /^tasks$/i })).toBeInTheDocument()

    // The $teamId route param was correctly extracted from the URL and used
    // for both queries, not a hardcoded/incorrect value.
    expect(getTeamMock).toHaveBeenCalledWith('team-1')
    expect(getTeamMembersMock).toHaveBeenCalledWith('team-1')
  })

  it('renders the add-member form when the viewer is an owner or admin', async () => {
    getTeamMock.mockResolvedValue({ id: 'team-1', name: 'Engineering' })
    getTeamMembersMock.mockResolvedValue([
      { user_id: testUser.id, email: testUser.email, name: testUser.name, role: 'owner' },
    ])

    renderTeamPageAt('/teams/team-1')

    expect(await screen.findByText(/add a member/i)).toBeInTheDocument()
  })
})
