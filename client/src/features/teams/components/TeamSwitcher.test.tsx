import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamSwitcher } from './TeamSwitcher'

const { getTeamsMock } = vi.hoisted(() => ({ getTeamsMock: vi.fn() }))

vi.mock('../api/get-teams', () => ({
  getTeams: getTeamsMock,
}))

function renderSwitcher(currentTeamId: string) {
  const queryClient = new QueryClient()
  const rootRoute = createRootRoute()
  const teamRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/teams/$teamId',
    component: function TeamRouteStub() {
      const { teamId } = teamRoute.useParams()
      return (
        <div>
          <div>Team page for {teamId}</div>
          <TeamSwitcher currentTeamId={currentTeamId} />
        </div>
      )
    },
  })
  const routeTree = rootRoute.addChildren([teamRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/teams/${currentTeamId}`] }),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('TeamSwitcher', () => {
  beforeEach(() => {
    getTeamsMock.mockReset()
  })

  it('renders nothing when the user has no other teams', async () => {
    getTeamsMock.mockResolvedValue([{ id: 'team-1', name: 'Engineering' }])

    renderSwitcher('team-1')

    await waitFor(() => {
      expect(getTeamsMock).toHaveBeenCalled()
    })
    expect(screen.queryByRole('button', { name: /switch team/i })).not.toBeInTheDocument()
  })

  it('lists other teams and navigates to the selected one', async () => {
    getTeamsMock.mockResolvedValue([
      { id: 'team-1', name: 'Engineering' },
      { id: 'team-2', name: 'Design' },
    ])
    const user = userEvent.setup()

    renderSwitcher('team-1')

    const switchButton = await screen.findByRole('button', { name: /switch team/i })
    await user.click(switchButton)

    const designOption = await screen.findByRole('menuitem', { name: 'Design' })
    expect(screen.queryByRole('menuitem', { name: 'Engineering' })).not.toBeInTheDocument()

    await user.click(designOption)

    await waitFor(() => {
      expect(screen.getByText(/team page for team-2/i)).toBeInTheDocument()
    })
  })
})
