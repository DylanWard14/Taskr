import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TaskCard } from './TaskCard'
import type { Task } from '../types'

afterEach(() => cleanup())

const baseTask: Task = {
  id: 'task-1',
  teamId: 'team-1',
  title: 'Write tests',
  status: 'todo',
  priority: 'high',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('TaskCard', () => {
  it('renders the task title and priority', () => {
    render(<TaskCard task={baseTask} />)
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('renders the assignee and due date when present', () => {
    const task: Task = { ...baseTask, assigneeId: 'user-42', dueDate: '2026-02-01T00:00:00.000Z' }
    render(<TaskCard task={task} />)
    expect(screen.getByText('Assignee: user-42')).toBeInTheDocument()
    expect(screen.getByText(/Due/)).toBeInTheDocument()
  })

  it('calls onOpen with the task when clicked', () => {
    const onOpen = vi.fn()
    render(<TaskCard task={baseTask} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('Write tests'))
    expect(onOpen).toHaveBeenCalledWith(baseTask)
  })

  it('calls onStatusChange with the new status when moved', () => {
    const onStatusChange = vi.fn()
    render(<TaskCard task={baseTask} onStatusChange={onStatusChange} />)

    const combobox = screen.getByRole('combobox', { name: `Move ${baseTask.title}` })
    fireEvent.mouseDown(combobox)

    const option = screen.getByRole('option', { name: 'Done' })
    fireEvent.click(option)

    expect(onStatusChange).toHaveBeenCalledWith(baseTask, 'done')
  })

  it('does not render a status selector when onStatusChange is not provided', () => {
    render(<TaskCard task={baseTask} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
