import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskBoard } from './TaskBoard'
import { ApiError } from '../../../lib/api-client'
import type { Task } from '../types'
import type { TeamMember } from '../../teams/types'

const { getTasksMock, createTaskMock } = vi.hoisted(() => ({
  getTasksMock: vi.fn(),
  createTaskMock: vi.fn(),
}))

vi.mock('../api/get-tasks', () => ({
  getTasks: getTasksMock,
}))

vi.mock('../api/create-task', () => ({
  createTask: createTaskMock,
}))

const members: TeamMember[] = [
  { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner Person', role: 'owner' },
  { user_id: 'u-member', email: 'member@example.com', name: 'Member Person', role: 'member' },
]

function task(overrides: Partial<Task>): Task {
  return {
    id: 't-default',
    team_id: 'team-1',
    title: 'Default task',
    description: null,
    status: 'todo',
    priority: 'medium',
    assignee_id: null,
    created_by: 'u-owner',
    due_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderBoard(viewerRole: TeamMember['role'] = 'owner') {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskBoard teamId="team-1" members={members} viewerRole={viewerRole} viewerUserId="u-owner" />
    </QueryClientProvider>,
  )
}

describe('TaskBoard', () => {
  beforeEach(() => {
    getTasksMock.mockReset()
    createTaskMock.mockReset()
  })

  it('groups tasks into the correct status columns', async () => {
    getTasksMock.mockResolvedValue([
      task({ id: 't1', title: 'Todo task', status: 'todo' }),
      task({ id: 't2', title: 'Doing task', status: 'in-progress' }),
      task({ id: 't3', title: 'Done task', status: 'done' }),
      task({ id: 't4', title: 'Another todo', status: 'todo' }),
    ])
    renderBoard()

    expect(await screen.findByText('Todo task')).toBeInTheDocument()

    const todoHeading = screen.getByRole('heading', { name: /^todo \(2\)$/i })
    const inProgressHeading = screen.getByRole('heading', { name: /^in progress \(1\)$/i })
    const doneHeading = screen.getByRole('heading', { name: /^done \(1\)$/i })

    const todoColumn = todoHeading.closest('div') as HTMLElement
    const inProgressColumn = inProgressHeading.closest('div') as HTMLElement
    const doneColumn = doneHeading.closest('div') as HTMLElement

    expect(within(todoColumn).getByText('Todo task')).toBeInTheDocument()
    expect(within(todoColumn).getByText('Another todo')).toBeInTheDocument()
    expect(within(inProgressColumn).getByText('Doing task')).toBeInTheDocument()
    expect(within(doneColumn).getByText('Done task')).toBeInTheDocument()
  })

  it('shows an empty state for a column with no tasks', async () => {
    getTasksMock.mockResolvedValue([task({ id: 't1', title: 'Todo task', status: 'todo' })])
    renderBoard()

    expect(await screen.findByText('Todo task')).toBeInTheDocument()
    expect(screen.getAllByText(/no tasks here/i)).toHaveLength(2)
  })

  it('creates a task with the selected assignee via the New task dialog', async () => {
    getTasksMock.mockResolvedValue([])
    createTaskMock.mockResolvedValue(task({ id: 't-new', title: 'Ship it', assignee_id: 'u-member' }))
    const user = userEvent.setup()
    renderBoard()

    await screen.findAllByText(/no tasks here/i)

    await user.click(screen.getByRole('button', { name: /new task/i }))
    await user.type(screen.getByLabelText(/title/i), 'Ship it')
    await user.click(screen.getByLabelText(/assignee/i))
    await user.click(await screen.findByRole('option', { name: 'Member Person' }))
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalledWith(
        'team-1',
        expect.objectContaining({ title: 'Ship it', assigneeId: 'u-member' }),
      )
    })
  })

  it('surfaces a server validation error on create failure (e.g. a 400 rejecting the assignee)', async () => {
    getTasksMock.mockResolvedValue([])
    createTaskMock.mockRejectedValue(new ApiError('Assignee must be a member of the team', 400))
    const user = userEvent.setup()
    renderBoard()

    await screen.findAllByText(/no tasks here/i)

    await user.click(screen.getByRole('button', { name: /new task/i }))
    await user.type(screen.getByLabelText(/title/i), 'Ship it')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/assignee must be a member of the team/i)).toBeInTheDocument()
  })
})
