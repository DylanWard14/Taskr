import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the sign-in prompt at the root route', () => {
    render(<App />)
    expect(screen.getByText(/sign in to see your teams/i)).toBeInTheDocument()
  })
})
