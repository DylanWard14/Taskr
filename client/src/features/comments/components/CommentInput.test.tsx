import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentInput } from './CommentInput'
import { ApiError } from '../../../lib/api-client'

const { createCommentMock } = vi.hoisted(() => ({ createCommentMock: vi.fn() }))

vi.mock('../api/create-comment', () => ({
  createComment: createCommentMock,
}))

function renderInput() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <CommentInput taskId="t1" />
    </QueryClientProvider>,
  )
}

describe('CommentInput', () => {
  beforeEach(() => {
    createCommentMock.mockReset()
  })

  it('posts a new comment and clears the input on success', async () => {
    createCommentMock.mockResolvedValue({
      id: 'c1',
      task_id: 't1',
      author_id: 'u1',
      body: 'Looks good',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    renderInput()

    const field = screen.getByLabelText(/add a comment/i)
    await user.type(field, 'Looks good')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    await waitFor(() => {
      expect(createCommentMock).toHaveBeenCalledWith('t1', { body: 'Looks good' })
    })
    await waitFor(() => {
      expect(field).toHaveValue('')
    })
  })

  it('disables the submit button for an empty or whitespace-only comment', async () => {
    const user = userEvent.setup()
    renderInput()

    // The button is disabled (not just a no-op on click) for whitespace-only
    // input, so userEvent correctly refuses to click it - assert the
    // disabled state directly rather than attempting the click.
    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled()

    await user.type(screen.getByLabelText(/add a comment/i), '   ')

    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled()
    expect(createCommentMock).not.toHaveBeenCalled()
  })

  it('surfaces a server error via Alert', async () => {
    createCommentMock.mockRejectedValue(new ApiError('Body is required', 400))
    const user = userEvent.setup()
    renderInput()

    await user.type(screen.getByLabelText(/add a comment/i), 'Hi')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    expect(await screen.findByText(/body is required/i)).toBeInTheDocument()
  })
})
