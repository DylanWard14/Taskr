import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskFormDialog } from './TaskFormDialog'
import type { Task } from '../types'
import type { TeamMember } from '../../teams/types'

const { createTaskMock, updateTaskMock } = vi.hoisted(() => ({
  createTaskMock: vi.fn(),
  updateTaskMock: vi.fn(),
}))

vi.mock('../api/create-task', () => ({
  createTask: createTaskMock,
}))

vi.mock('../api/update-task', () => ({
  updateTask: updateTaskMock,
}))

const members: TeamMember[] = [
  { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner Person', role: 'owner' },
  { user_id: 'u-member', email: 'member@example.com', name: 'Member Person', role: 'member' },
]

const existingTask: Task = {
  id: 't1',
  team_id: 'team-1',
  title: 'Existing title',
  description: 'Existing description',
  status: 'todo',
  priority: 'high',
  assignee_id: 'u-member',
  created_by: 'u-owner',
  due_date: '2026-03-15T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function renderDialog(props: Partial<React.ComponentProps<typeof TaskFormDialog>> = {}) {
  const queryClient = new QueryClient()
  const onClose = vi.fn()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <TaskFormDialog
        teamId="team-1"
        members={members}
        open
        onClose={onClose}
        mode="create"
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, onClose }
}

describe('TaskFormDialog', () => {
  beforeEach(() => {
    createTaskMock.mockReset()
    updateTaskMock.mockReset()
  })

  describe('create mode', () => {
    it('starts with empty fields and "Unassigned" selected', () => {
      renderDialog({ mode: 'create' })

      expect(screen.getByLabelText(/title/i)).toHaveValue('')
      expect(screen.getByLabelText(/description/i)).toHaveValue('')
      expect(screen.getByLabelText(/assignee/i)).toHaveTextContent('Unassigned')
    })

    it('omits assigneeId entirely when "Unassigned" is left selected', async () => {
      createTaskMock.mockResolvedValue({ ...existingTask, id: 't-new' })
      const user = userEvent.setup()
      renderDialog({ mode: 'create' })

      await user.type(screen.getByLabelText(/title/i), 'A brand new task')
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      await waitFor(() => {
        expect(createTaskMock).toHaveBeenCalled()
      })
      const [, input] = createTaskMock.mock.calls[0]
      // An object literal like `{ assigneeId: undefined }` still has the key
      // as an own property, so `not.toHaveProperty` would pass regardless of
      // whether the code actually omits it — what matters is that the value
      // is `undefined`, since that's what JSON.stringify drops from the body.
      expect(input.assigneeId).toBeUndefined()
    })

    it('includes assigneeId when a member is selected', async () => {
      createTaskMock.mockResolvedValue({ ...existingTask, id: 't-new' })
      const user = userEvent.setup()
      renderDialog({ mode: 'create' })

      await user.type(screen.getByLabelText(/title/i), 'Assign me')
      await user.click(screen.getByLabelText(/assignee/i))
      await user.click(await screen.findByRole('option', { name: 'Member Person' }))
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      await waitFor(() => {
        expect(createTaskMock).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({ assigneeId: 'u-member' }),
        )
      })
    })

    it('omits an empty description rather than sending an empty string', async () => {
      createTaskMock.mockResolvedValue({ ...existingTask, id: 't-new' })
      const user = userEvent.setup()
      renderDialog({ mode: 'create' })

      await user.type(screen.getByLabelText(/title/i), 'No description')
      await user.click(screen.getByRole('button', { name: /^create$/i }))

      await waitFor(() => {
        expect(createTaskMock).toHaveBeenCalled()
      })
      const [, input] = createTaskMock.mock.calls[0]
      expect(input.description).toBeUndefined()
    })
  })

  describe('edit mode', () => {
    it('pre-populates all fields from the task being edited', () => {
      renderDialog({ mode: 'edit', task: existingTask })

      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title')
      expect(screen.getByLabelText(/description/i)).toHaveValue('Existing description')
      expect(screen.getByLabelText(/due date/i)).toHaveValue('2026-03-15')
      expect(screen.getByLabelText(/assignee/i)).toHaveTextContent('Member Person')
      expect(screen.getByLabelText(/priority/i)).toHaveTextContent('high')
    })

    it('falls back to "Unassigned" when the current assignee is no longer a team member', () => {
      renderDialog({
        mode: 'edit',
        task: { ...existingTask, assignee_id: 'someone-removed' },
      })

      expect(screen.getByLabelText(/assignee/i)).toHaveTextContent('Unassigned')
    })

    it('sends assigneeId: null when switching an assigned task to "Unassigned"', async () => {
      updateTaskMock.mockResolvedValue({ ...existingTask, assignee_id: null })
      const user = userEvent.setup()
      renderDialog({ mode: 'edit', task: existingTask })

      await user.click(screen.getByLabelText(/assignee/i))
      await user.click(await screen.findByRole('option', { name: /^unassigned$/i }))
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(updateTaskMock).toHaveBeenCalledWith(
          'team-1',
          't1',
          expect.objectContaining({ assigneeId: null }),
        )
      })
    })

    it('sends an empty-string description (not undefined) when the description is cleared', async () => {
      updateTaskMock.mockResolvedValue({ ...existingTask, description: '' })
      const user = userEvent.setup()
      renderDialog({ mode: 'edit', task: existingTask })

      const descriptionField = screen.getByLabelText(/description/i)
      await user.clear(descriptionField)
      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(updateTaskMock).toHaveBeenCalled()
      })
      const [, , input] = updateTaskMock.mock.calls[0]
      expect(input).toHaveProperty('description', '')
    })

    it('sends changed title, priority, and due date fields', async () => {
      updateTaskMock.mockResolvedValue(existingTask)
      const user = userEvent.setup()
      renderDialog({ mode: 'edit', task: existingTask })

      const titleField = screen.getByLabelText(/title/i)
      await user.clear(titleField)
      await user.type(titleField, 'Updated title')

      const dueDateField = screen.getByLabelText(/due date/i)
      await user.clear(dueDateField)
      await user.type(dueDateField, '2026-04-01')

      await user.click(screen.getByLabelText(/priority/i))
      await user.click(await screen.findByRole('option', { name: 'low' }))

      await user.click(screen.getByRole('button', { name: /^save$/i }))

      await waitFor(() => {
        expect(updateTaskMock).toHaveBeenCalledWith(
          'team-1',
          't1',
          expect.objectContaining({
            title: 'Updated title',
            priority: 'low',
            dueDate: new Date('2026-04-01T00:00:00.000Z').toISOString(),
          }),
        )
      })
    })
  })
})
