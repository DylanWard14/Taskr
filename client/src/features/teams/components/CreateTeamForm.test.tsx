import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateTeamForm } from './CreateTeamForm'
import { ApiError } from '../../../lib/api-client'

const { createTeamMock } = vi.hoisted(() => ({ createTeamMock: vi.fn() }))

vi.mock('../api/create-team', () => ({
  createTeam: createTeamMock,
}))

function renderCreateTeamForm() {
  const queryClient = new QueryClient()
  const rootRoute = createRootRoute({ component: CreateTeamForm })
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

describe('CreateTeamForm', () => {
  beforeEach(() => {
    createTeamMock.mockReset()
  })

  it('surfaces a server error without closing the dialog', async () => {
    createTeamMock.mockRejectedValue(new ApiError('Something went wrong', 500))
    const user = userEvent.setup()
    renderCreateTeamForm()

    await user.click(await screen.findByRole('button', { name: /create team/i }))
    await user.type(screen.getByLabelText(/team name/i), 'Engineering')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument()
  })
})
