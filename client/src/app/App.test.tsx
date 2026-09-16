import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createAppRouter } from './routes'

// Navigation/guard scenarios (redirects, protected content, etc.) are
// covered by app/routes.test.tsx. This file only asserts that App wires up
// its providers (theme, query client, router) correctly.
vi.mock('../features/auth/api/get-me', () => ({
  getMe: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('mounts the MUI theme, query client, and router providers and renders a route', async () => {
    const queryClient = new QueryClient()
    const history = createMemoryHistory({ initialEntries: ['/login'] })
    const router = createAppRouter(queryClient, history)

    render(<App queryClient={queryClient} router={router} />)

    // A rendered heading from the matched route confirms RouterProvider is
    // working; the presence of MUI-styled output confirms ThemeProvider/
    // CssBaseline are in the tree (oxlint/vitest don't check computed CSS,
    // so we just assert the app rendered something from within the routing
    // + MUI stack rather than throwing).
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    })
  })
})
