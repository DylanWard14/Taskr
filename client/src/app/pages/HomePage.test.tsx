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
import { beforeEach, describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import { currentUserQueryKey } from '../../features/auth/hooks/useCurrentUser'
import { TOKEN_STORAGE_KEY } from '../../lib/constants'
import type { User } from '../../features/auth/types'

const testUser: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' }

// A minimal router (no auth beforeLoad guards — those are covered by
// app/routes.test.tsx) just to give HomePage's useNavigate()/Link a router
// context to operate in, with a stub /login destination to assert against.
function renderHomePage(queryClient: QueryClient) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Login page stub</div>,
  })
  const routeTree = rootRoute.addChildren([indexRoute, loginRoute])
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
  })

  it("renders the signed-in user's name", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryKey, testUser)

    renderHomePage(queryClient)

    await waitFor(() => {
      expect(screen.getByText(/signed in as ada lovelace/i)).toBeInTheDocument()
    })
  })

  it('logs out and navigates to /login when the logout button is clicked', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryKey, testUser)

    renderHomePage(queryClient)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(screen.getByText(/login page stub/i)).toBeInTheDocument()
    })
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  })
})
