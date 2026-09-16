import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoutePendingPage } from './RoutePendingPage'

describe('RoutePendingPage', () => {
  it('renders a progress indicator', () => {
    render(<RoutePendingPage />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
