import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StatusColumn } from './StatusColumn'
import type { Task } from '../types'

afterEach(() => cleanup())

const tasks: Task[] = [
  {
    id: 'task-1',
    teamId: 'team-1',
    title: 'First task',
    status: 'todo',
    priority: 'low',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-2',
    teamId: 'team-1',
    title: 'Second task',
    status: 'todo',
    priority: 'medium',
    createdAt: '',
    updatedAt: '',
  },
]

describe('StatusColumn', () => {
  it('renders the title, task count, and each task', () => {
    render(<StatusColumn status="todo" title="To Do" tasks={tasks} />)

    const column = screen.getByTestId('status-column-todo')
    expect(within(column).getByText('To Do')).toBeInTheDocument()
    expect(within(column).getByText('2')).toBeInTheDocument()
    expect(within(column).getByText('First task')).toBeInTheDocument()
    expect(within(column).getByText('Second task')).toBeInTheDocument()
  })

  it('shows an empty state when there are no tasks', () => {
    render(<StatusColumn status="done" title="Done" tasks={[]} />)
    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })
})
