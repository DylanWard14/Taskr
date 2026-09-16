import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'
import { ApiError } from '../../../lib/api-client'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))

vi.mock('../api/login', () => ({
  login: loginMock,
}))

function renderLoginForm(onSuccess?: () => void) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset()
    localStorage.clear()
  })

  it('shows a validation error for an invalid email without calling the API', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('shows a validation error for a too-short password without calling the API', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('calls the login mutation and onSuccess when submission is valid', async () => {
    loginMock.mockResolvedValue({
      token: 'a-token',
      user: { id: '1', email: 'ada@example.com', name: 'Ada' },
    })
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderLoginForm(onSuccess)

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('ada@example.com', 'password123')
    })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
    expect(localStorage.getItem('taskr_token')).toBe('a-token')
  })

  it('surfaces a server error message', async () => {
    loginMock.mockRejectedValue(new ApiError('Invalid email or password', 401))
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
  })
})
