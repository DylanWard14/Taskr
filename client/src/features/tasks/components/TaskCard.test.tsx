import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskCard } from './TaskCard'
import { ApiError } from '../../../lib/api-client'
import type { Task } from '../types'
import type { TeamMember } from '../../teams/types'

const { updateTaskMock, deleteTaskMock } = vi.hoisted(() => ({
  updateTaskMock: vi.fn(),
  deleteTaskMock: vi.fn(),
}))

vi.mock('../api/update-task', () => ({
  updateTask: updateTaskMock,
}))

vi.mock('../api/delete-task', () => ({
  deleteTask: deleteTaskMock,
}))

const members: TeamMember[] = [
  { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner Person', role: 'owner' },
  { user_id: 'u-member', email: 'member@example.com', name: 'Member Person', role: 'member' },
]

const baseTask: Task = {
  id: 't1',
  team_id: 'team-1',
  title: 'Ship the feature',
  description: 'Some details',
  status: 'todo',
  priority: 'high',
  assignee_id: 'u-member',
  created_by: 'u-owner',
  due_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function renderCard(task: Task, viewerRole: TeamMember['role']) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskCard teamId="team-1" task={task} members={members} viewerRole={viewerRole} />
    </QueryClientProvider>,
  )
}

describe('TaskCard', () => {
  beforeEach(() => {
    updateTaskMock.mockReset()
    deleteTaskMock.mockReset()
  })

  it('resolves and shows the assignee name from the members list', () => {
    renderCard(baseTask, 'owner')
    expect(screen.getByText('Member Person')).toBeInTheDocument()
  })

  it('shows "Unassigned" when there is no assignee', () => {
    renderCard({ ...baseTask, assignee_id: null }, 'owner')
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('moves the task to a different status via the Move to… menu', async () => {
    updateTaskMock.mockResolvedValue({ ...baseTask, status: 'in-progress' })
    const user = userEvent.setup()
    renderCard(baseTask, 'owner')

    await user.click(screen.getByRole('button', { name: /move to/i }))
    await user.click(await screen.findByRole('menuitem', { name: /in progress/i }))

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith('team-1', 't1', { status: 'in-progress' })
    })
  })

  it('only offers the other two statuses in the Move to… menu, not the current one', async () => {
    const user = userEvent.setup()
    renderCard(baseTask, 'owner') // status: 'todo'

    await user.click(screen.getByRole('button', { name: /move to/i }))

    expect(screen.queryByRole('menuitem', { name: /^todo$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^in progress$/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^done$/i })).toBeInTheDocument()
  })

  it('offers todo and in-progress (not done) when moving a done task', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseTask, status: 'done' }, 'owner')

    await user.click(screen.getByRole('button', { name: /move to/i }))

    expect(screen.queryByRole('menuitem', { name: /^done$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^todo$/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^in progress$/i })).toBeInTheDocument()
  })

  it('moves a done task back to todo', async () => {
    updateTaskMock.mockResolvedValue({ ...baseTask, status: 'todo' })
    const user = userEvent.setup()
    renderCard({ ...baseTask, status: 'done' }, 'owner')

    await user.click(screen.getByRole('button', { name: /move to/i }))
    await user.click(await screen.findByRole('menuitem', { name: /^todo$/i }))

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith('team-1', 't1', { status: 'todo' })
    })
  })

  it('hides the delete button for a plain member', () => {
    renderCard(baseTask, 'member')
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('shows the delete button for an owner', () => {
    renderCard(baseTask, 'owner')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('shows the delete button for an admin', () => {
    renderCard(baseTask, 'admin')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('surfaces a 403 error if a delete attempt is rejected server-side', async () => {
    deleteTaskMock.mockRejectedValue(new ApiError('Only team owners and admins can delete tasks', 403))
    const user = userEvent.setup()
    renderCard(baseTask, 'owner')

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(await screen.findByText(/only team owners and admins can delete tasks/i)).toBeInTheDocument()
  })
})
