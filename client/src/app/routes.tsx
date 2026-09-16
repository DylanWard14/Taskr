import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Layout } from './Layout'
import { HomePage } from './pages/HomePage'
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

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
  component: HomePage,
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

export const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute])

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
