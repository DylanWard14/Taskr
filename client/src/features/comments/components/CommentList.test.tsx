import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentList } from './CommentList'
import type { Comment } from '../types'

// The project's vitest config doesn't enable test globals, so Testing
// Library's automatic afterEach cleanup isn't registered - do it explicitly.
afterEach(() => {
  cleanup()
})

const comments: Comment[] = [
  { id: 'c1', taskId: 't1', authorId: 'user-1', body: 'First comment', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'c2', taskId: 't1', authorId: 'user-2', body: 'Second comment', createdAt: '2026-01-02T00:00:00.000Z' },
]

describe('CommentList', () => {
  it('shows an empty state when there are no comments', () => {
    render(<CommentList comments={[]} />)
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('renders each comment body', () => {
    render(<CommentList comments={comments} />)
    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
  })

  it('does not render delete actions when onDelete is not provided', () => {
    render(<CommentList comments={comments} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('calls onDelete with the comment id when its delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<CommentList comments={comments} onDelete={onDelete} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons).toHaveLength(2)

    fireEvent.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('c1')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
