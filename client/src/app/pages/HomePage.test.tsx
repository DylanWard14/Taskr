import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

const { getTeamsMock, createTeamMock } = vi.hoisted(() => ({
  getTeamsMock: vi.fn(),
  createTeamMock: vi.fn(),
}))

vi.mock('../../features/teams/api/get-teams', () => ({
  getTeams: getTeamsMock,
}))

vi.mock('../../features/teams/api/create-team', () => ({
  createTeam: createTeamMock,
}))

// A minimal router (no auth beforeLoad guards — those are covered by
// app/routes.test.tsx) just to give HomePage's Link/useNavigate() a router
// context to operate in, with a stub team page destination to assert against.
function renderHomePage(queryClient: QueryClient) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
  const teamRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/teams/$teamId',
    component: function TeamRouteStub() {
      const { teamId } = teamRoute.useParams()
      return <div>Team page stub for {teamId}</div>
    },
  })
  const routeTree = rootRoute.addChildren([indexRoute, teamRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear()
    getTeamsMock.mockReset()
    createTeamMock.mockReset()
  })

  it('shows an empty state when the user has no teams', async () => {
    getTeamsMock.mockResolvedValue([])
    const queryClient = new QueryClient()

    renderHomePage(queryClient)

    expect(await screen.findByText(/a member of any teams yet/i)).toBeInTheDocument()
  })

  it("lists the user's teams", async () => {
    getTeamsMock.mockResolvedValue([
      { id: 'team-1', name: 'Engineering' },
      { id: 'team-2', name: 'Design' },
    ])
    const queryClient = new QueryClient()

    renderHomePage(queryClient)

    expect(await screen.findByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
  })

  it('navigates to a team page when a team is clicked', async () => {
    getTeamsMock.mockResolvedValue([{ id: 'team-1', name: 'Engineering' }])
    const queryClient = new QueryClient()
    const user = userEvent.setup()

    renderHomePage(queryClient)

    await user.click(await screen.findByText('Engineering'))

    await waitFor(() => {
      expect(screen.getByText(/team page stub for team-1/i)).toBeInTheDocument()
    })
  })

  it('creates a team and navigates to it on success', async () => {
    getTeamsMock.mockResolvedValue([])
    createTeamMock.mockResolvedValue({ id: 'new-team', name: 'New Team' })
    const queryClient = new QueryClient()
    const user = userEvent.setup()

    renderHomePage(queryClient)

    await user.click(await screen.findByRole('button', { name: /create team/i }))
    await user.type(await screen.findByLabelText(/team name/i), 'New Team')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(createTeamMock).toHaveBeenCalledWith({ name: 'New Team' })
    })
    await waitFor(() => {
      expect(screen.getByText(/team page stub for new-team/i)).toBeInTheDocument()
    })
  })

  it('shows a validation error when submitting an empty team name', async () => {
    getTeamsMock.mockResolvedValue([])
    const queryClient = new QueryClient()
    const user = userEvent.setup()

    renderHomePage(queryClient)

    await user.click(await screen.findByRole('button', { name: /create team/i }))
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/team name is required/i)).toBeInTheDocument()
    expect(createTeamMock).not.toHaveBeenCalled()
  })
})
