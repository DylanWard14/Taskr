import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamList } from './TeamList'

const { getTeamsMock } = vi.hoisted(() => ({ getTeamsMock: vi.fn() }))

vi.mock('../api/get-teams', () => ({
  getTeams: getTeamsMock,
}))

function renderTeamList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: TeamList })
  const teamRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/teams/$teamId',
    component: () => <div>Team page stub</div>,
  })
  const routeTree = rootRoute.addChildren([teamRoute])
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('TeamList', () => {
  beforeEach(() => {
    getTeamsMock.mockReset()
  })

  it('shows an error message when teams fail to load', async () => {
    getTeamsMock.mockRejectedValue(new Error('network error'))

    renderTeamList()

    expect(await screen.findByText(/failed to load your teams/i)).toBeInTheDocument()
  })
})
