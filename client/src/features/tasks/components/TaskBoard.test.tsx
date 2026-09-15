import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TaskBoard } from './TaskBoard'
import type { Task } from '../types'

afterEach(() => cleanup())

const tasks: Task[] = [
  {
    id: 'task-1',
    teamId: 'team-1',
    title: 'Task A',
    status: 'todo',
    priority: 'low',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-2',
    teamId: 'team-1',
    title: 'Task B',
    status: 'in-progress',
    priority: 'medium',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-3',
    teamId: 'team-1',
    title: 'Task C',
    status: 'done',
    priority: 'high',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-4',
    teamId: 'team-1',
    title: 'Task D',
    status: 'todo',
    priority: 'high',
    createdAt: '',
    updatedAt: '',
  },
]

vi.mock('../api/get-tasks', () => ({
  getTasks: vi.fn(() => Promise.resolve(tasks)),
}))

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/teams/team-1/tasks']}>
      <Routes>
        <Route path="/teams/:teamId/tasks" element={<TaskBoard />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TaskBoard', () => {
  it('renders tasks grouped into their status columns', async () => {
    renderBoard()

    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())

    const todoColumn = screen.getByTestId('status-column-todo')
    const inProgressColumn = screen.getByTestId('status-column-in-progress')
    const doneColumn = screen.getByTestId('status-column-done')

    expect(within(todoColumn).getByText('Task A')).toBeInTheDocument()
    expect(within(todoColumn).getByText('Task D')).toBeInTheDocument()
    expect(within(todoColumn).queryByText('Task B')).not.toBeInTheDocument()

    expect(within(inProgressColumn).getByText('Task B')).toBeInTheDocument()
    expect(within(inProgressColumn).queryByText('Task A')).not.toBeInTheDocument()

    expect(within(doneColumn).getByText('Task C')).toBeInTheDocument()
    expect(within(doneColumn).queryByText('Task A')).not.toBeInTheDocument()
  })

  it('shows the correct per-column task counts', async () => {
    renderBoard()

    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())

    const todoColumn = screen.getByTestId('status-column-todo')
    const inProgressColumn = screen.getByTestId('status-column-in-progress')
    const doneColumn = screen.getByTestId('status-column-done')

    expect(within(todoColumn).getByText('2')).toBeInTheDocument()
    expect(within(inProgressColumn).getByText('1')).toBeInTheDocument()
    expect(within(doneColumn).getByText('1')).toBeInTheDocument()
  })
})
