import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from '../LoginForm'
import * as loginApi from '../../api/login'

vi.mock('../../api/login', () => ({
  login: vi.fn(),
}))

const loginMock = vi.mocked(loginApi.login)

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders email, password fields and a submit button', () => {
    renderLoginForm()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits the entered credentials to the login API and stores the session', async () => {
    loginMock.mockResolvedValue({
      token: 'token-123',
      user: { id: '1', email: 'jane@example.com', name: 'Jane Doe' },
    })

    renderLoginForm()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'supersecret' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('jane@example.com', 'supersecret')
    })

    await waitFor(() => {
      expect(localStorage.getItem('taskr_token')).toBe('token-123')
    })
    expect(localStorage.getItem('taskr_user')).toBe(
      JSON.stringify({ id: '1', email: 'jane@example.com', name: 'Jane Doe' }),
    )
  })

  it('shows an error message when login fails', async () => {
    loginMock.mockRejectedValue(new Error('Request to /auth/login failed with 401'))

    renderLoginForm()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed with 401/i)
    expect(localStorage.getItem('taskr_token')).toBeNull()
  })
})
