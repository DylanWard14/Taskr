import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamMembersList } from './TeamMembersList'
import { ApiError } from '../../../lib/api-client'
import type { TeamMember } from '../types'

const { updateMemberRoleMock, removeTeamMemberMock } = vi.hoisted(() => ({
  updateMemberRoleMock: vi.fn(),
  removeTeamMemberMock: vi.fn(),
}))

vi.mock('../api/update-member-role', () => ({
  updateMemberRole: updateMemberRoleMock,
}))

vi.mock('../api/remove-team-member', () => ({
  removeTeamMember: removeTeamMemberMock,
}))

const owner: TeamMember = { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner Person', role: 'owner' }
const admin: TeamMember = { user_id: 'u-admin', email: 'admin@example.com', name: 'Admin Person', role: 'admin' }
const member: TeamMember = { user_id: 'u-member', email: 'member@example.com', name: 'Member Person', role: 'member' }

function renderList(members: TeamMember[], viewerUserId: string, viewerRole: TeamMember['role'], onLeave = vi.fn()) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamMembersList
        teamId="team-1"
        members={members}
        viewerUserId={viewerUserId}
        viewerRole={viewerRole}
        onLeave={onLeave}
      />
    </QueryClientProvider>,
  )
}

function rowFor(name: string) {
  return screen.getByText(name, { exact: false }).closest('li') as HTMLElement
}

describe('TeamMembersList permission gating', () => {
  beforeEach(() => {
    updateMemberRoleMock.mockReset()
    removeTeamMemberMock.mockReset()
  })

  it('an owner sees role controls and a remove button for other members, and leave for themselves', () => {
    renderList([owner, admin, member], owner.user_id, 'owner')

    // Owner's own row: no role controls, only "Leave team".
    const ownerRow = rowFor('Owner Person')
    expect(within(ownerRow).queryByRole('button', { name: /make admin/i })).not.toBeInTheDocument()
    expect(within(ownerRow).queryByRole('button', { name: /make member/i })).not.toBeInTheDocument()
    expect(within(ownerRow).getByRole('button', { name: /leave team/i })).toBeInTheDocument()

    // Admin row: owner can change role and remove.
    const adminRow = rowFor('Admin Person')
    expect(within(adminRow).getByRole('button', { name: /make member/i })).toBeInTheDocument()
    expect(within(adminRow).getByRole('button', { name: /^remove$/i })).toBeInTheDocument()

    // Member row: owner can change role and remove.
    const memberRow = rowFor('Member Person')
    expect(within(memberRow).getByRole('button', { name: /make admin/i })).toBeInTheDocument()
    expect(within(memberRow).getByRole('button', { name: /^remove$/i })).toBeInTheDocument()
  })

  it('an admin can only remove plain members, cannot change any roles, and can leave themselves', () => {
    renderList([owner, admin, member], admin.user_id, 'admin')

    const ownerRow = rowFor('Owner Person')
    expect(within(ownerRow).queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(within(ownerRow).queryByRole('button', { name: /make/i })).not.toBeInTheDocument()

    const adminRow = rowFor('Admin Person')
    expect(within(adminRow).queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument()
    expect(within(adminRow).getByRole('button', { name: /leave team/i })).toBeInTheDocument()
    expect(within(adminRow).queryByRole('button', { name: /make/i })).not.toBeInTheDocument()

    const memberRow = rowFor('Member Person')
    expect(within(memberRow).getByRole('button', { name: /^remove$/i })).toBeInTheDocument()
    expect(within(memberRow).queryByRole('button', { name: /make/i })).not.toBeInTheDocument()
  })

  it('a plain member sees no management controls except leaving the team themselves', () => {
    renderList([owner, admin, member], member.user_id, 'member')

    const ownerRow = rowFor('Owner Person')
    expect(within(ownerRow).queryByRole('button')).not.toBeInTheDocument()

    const adminRow = rowFor('Admin Person')
    expect(within(adminRow).queryByRole('button')).not.toBeInTheDocument()

    const memberRow = rowFor('Member Person')
    expect(within(memberRow).queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument()
    expect(within(memberRow).getByRole('button', { name: /leave team/i })).toBeInTheDocument()
  })

  it('calls onLeave after a successful self-removal', async () => {
    removeTeamMemberMock.mockResolvedValue(undefined)
    const onLeave = vi.fn()
    const user = userEvent.setup()
    renderList([owner, member], member.user_id, 'member', onLeave)

    await user.click(screen.getByRole('button', { name: /leave team/i }))

    await waitFor(() => {
      expect(onLeave).toHaveBeenCalled()
    })
  })

  it('surfaces a meaningful error when demoting the last remaining owner is rejected', async () => {
    updateMemberRoleMock.mockRejectedValue(new ApiError('Cannot demote the last remaining owner', 409))
    const user = userEvent.setup()
    renderList([owner, member], owner.user_id, 'owner')

    const memberRow = rowFor('Member Person')
    await user.click(within(memberRow).getByRole('button', { name: /make admin/i }))

    expect(await screen.findByText(/cannot demote the last remaining owner/i)).toBeInTheDocument()
  })

  it('surfaces a meaningful error when removal is rejected by the server', async () => {
    removeTeamMemberMock.mockRejectedValue(
      new ApiError('Cannot remove the last remaining owner — promote another member first', 409),
    )
    const user = userEvent.setup()
    renderList([owner], owner.user_id, 'owner')

    await user.click(screen.getByRole('button', { name: /leave team/i }))

    expect(await screen.findByText(/promote another member first/i)).toBeInTheDocument()
  })

  it('surfaces a 403 permission error from a role change rejected server-side', async () => {
    updateMemberRoleMock.mockRejectedValue(new ApiError('Only an owner can change member roles', 403))
    const user = userEvent.setup()
    renderList([owner, member], owner.user_id, 'owner')

    const memberRow = rowFor('Member Person')
    await user.click(within(memberRow).getByRole('button', { name: /make admin/i }))

    expect(await screen.findByText(/only an owner can change member roles/i)).toBeInTheDocument()
  })

  it('surfaces a 403 permission error from a removal rejected server-side (e.g. a stale role client-side)', async () => {
    removeTeamMemberMock.mockRejectedValue(new ApiError('Only an owner or admin can remove a member', 403))
    const user = userEvent.setup()
    renderList([admin, member], admin.user_id, 'admin')

    const memberRow = rowFor('Member Person')
    await user.click(within(memberRow).getByRole('button', { name: /^remove$/i }))

    expect(await screen.findByText(/only an owner or admin can remove a member/i)).toBeInTheDocument()
  })
})
