import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddMemberForm } from './AddMemberForm'
import { ApiError } from '../../../lib/api-client'

const { addTeamMemberMock } = vi.hoisted(() => ({ addTeamMemberMock: vi.fn() }))

vi.mock('../api/add-team-member', () => ({
  addTeamMember: addTeamMemberMock,
}))

function renderForm(viewerRole: 'owner' | 'admin' = 'admin') {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AddMemberForm teamId="team-1" viewerRole={viewerRole} />
    </QueryClientProvider>,
  )
}

describe('AddMemberForm', () => {
  beforeEach(() => {
    addTeamMemberMock.mockReset()
  })

  it('does not offer the owner role to an admin viewer', () => {
    renderForm('admin')

    expect(screen.queryByRole('option', { name: 'owner' })).not.toBeInTheDocument()
  })

  it('offers the owner role to an owner viewer', async () => {
    renderForm('owner')
    const user = userEvent.setup()

    await user.click(screen.getByLabelText(/role/i))
    expect(await screen.findByRole('option', { name: 'owner' })).toBeInTheDocument()
  })

  it('shows a validation error for an empty email without calling the API', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /add member/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(addTeamMemberMock).not.toHaveBeenCalled()
  })

  it('adds a member with the selected role', async () => {
    addTeamMemberMock.mockResolvedValue({
      user_id: 'u2',
      email: 'bob@example.com',
      name: 'Bob',
      role: 'member',
    })
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    await waitFor(() => {
      expect(addTeamMemberMock).toHaveBeenCalledWith('team-1', { email: 'bob@example.com', role: 'member' })
    })
    expect(await screen.findByText(/member added/i)).toBeInTheDocument()
  })

  it('surfaces a 409 error for an already-existing member', async () => {
    addTeamMemberMock.mockRejectedValue(new ApiError('User is already a member of this team', 409))
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    expect(await screen.findByText(/already a member/i)).toBeInTheDocument()
  })

  it('surfaces a 404 error when no user exists with that email', async () => {
    addTeamMemberMock.mockRejectedValue(new ApiError('No user found with that email', 404))
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    expect(await screen.findByText(/no user found with that email/i)).toBeInTheDocument()
  })

  it('surfaces a 403 error when the viewer is not permitted to add members', async () => {
    addTeamMemberMock.mockRejectedValue(
      new ApiError('Only team owners and admins can add members', 403),
    )
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    expect(await screen.findByText(/only team owners and admins can add members/i)).toBeInTheDocument()
  })
})
