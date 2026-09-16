import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteErrorPage } from './RouteErrorPage'

describe('RouteErrorPage', () => {
  it('renders a generic error message', () => {
    render(<RouteErrorPage error={new Error('GET /auth/me failed with 500')} reset={vi.fn()} />)

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/try reloading/i)).toBeInTheDocument()
  })

  it('reloads the page when the reload button is clicked', async () => {
    const reload = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    })

    render(<RouteErrorPage error={new Error('boom')} reset={vi.fn()} />)
    screen.getByRole('button', { name: /reload/i }).click()

    expect(reload).toHaveBeenCalled()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })
})
