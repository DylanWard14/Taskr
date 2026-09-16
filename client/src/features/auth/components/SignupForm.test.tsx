import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupForm } from './SignupForm'
import { ApiError } from '../../../lib/api-client'

const { signupMock } = vi.hoisted(() => ({ signupMock: vi.fn() }))

vi.mock('../api/signup', () => ({
  signup: signupMock,
}))

function renderSignupForm(onSuccess?: () => void) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <SignupForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  )
}

describe('SignupForm', () => {
  beforeEach(() => {
    signupMock.mockReset()
    localStorage.clear()
  })

  it('shows a validation error when name is missing without calling the API', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(signupMock).not.toHaveBeenCalled()
  })

  it('shows a validation error for an invalid email without calling the API', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
    expect(signupMock).not.toHaveBeenCalled()
  })

  it('shows a validation error for a too-short password without calling the API', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(signupMock).not.toHaveBeenCalled()
  })

  it('calls the signup mutation and onSuccess when submission is valid', async () => {
    signupMock.mockResolvedValue({
      token: 'a-token',
      user: { id: '1', email: 'ada@example.com', name: 'Ada Lovelace' },
    })
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderSignupForm(onSuccess)

    await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'password123',
      })
    })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
    expect(localStorage.getItem('taskr_token')).toBe('a-token')
  })

  it('surfaces a server error message for a duplicate email', async () => {
    signupMock.mockRejectedValue(new ApiError('Email is already in use', 409))
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/email is already in use/i)).toBeInTheDocument()
  })
})
