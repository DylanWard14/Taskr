import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Layout } from './Layout'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { HomePage } from './pages/HomePage'
import { TeamPage } from './pages/TeamPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { RoutePendingPage } from './pages/RoutePendingPage'
import { currentUserQueryOptions } from '../features/auth/hooks/useCurrentUser'

export interface RouterContext {
  queryClient: QueryClient
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Layout,
})

// Pathless layout route: owns the "must be signed in" guard and renders the
// persistent authenticated app shell (top bar). All authenticated pages
// (`/`, `/teams/$teamId`, ...) nest under this instead of each repeating the
// beforeLoad check/shell markup.
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: HomePage,
})

export const teamRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/teams/$teamId',
  component: TeamPage,
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: SignupPage,
})

export const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([indexRoute, teamRoute]),
  loginRoute,
  signupRoute,
])

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Applied whenever a matched route (e.g. our beforeLoad auth checks)
    // doesn't define its own error/pending component, so a slow or failing
    // GET /auth/me always renders a deliberate state rather than a blank
    // page or the router's built-in fallback.
    defaultErrorComponent: RouteErrorPage,
    defaultPendingComponent: RoutePendingPage,
    ...(history ? { history } : {}),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
