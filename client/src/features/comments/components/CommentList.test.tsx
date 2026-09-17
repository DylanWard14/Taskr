import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentList } from './CommentList'
import { ApiError } from '../../../lib/api-client'
import type { Comment } from '../types'
import type { TeamMember } from '../../teams/types'

const { deleteCommentMock, listMediaMock } = vi.hoisted(() => ({
  deleteCommentMock: vi.fn(),
  listMediaMock: vi.fn(),
}))

vi.mock('../api/delete-comment', () => ({
  deleteComment: deleteCommentMock,
}))

vi.mock('../../media/api/list-media', () => ({
  listMedia: listMediaMock,
}))

const members: TeamMember[] = [
  { user_id: 'u-owner', email: 'owner@example.com', name: 'Owner Person', role: 'owner' },
  { user_id: 'u-member', email: 'member@example.com', name: 'Member Person', role: 'member' },
]

function comment(overrides: Partial<Comment>): Comment {
  return {
    id: 'c-default',
    task_id: 't1',
    author_id: 'u-member',
    body: 'A comment',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderList(comments: Comment[], viewerUserId: string, viewerRole: TeamMember['role']) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <CommentList
        taskId="t1"
        comments={comments}
        members={members}
        viewerUserId={viewerUserId}
        viewerRole={viewerRole}
      />
    </QueryClientProvider>,
  )
}

describe('CommentList', () => {
  beforeEach(() => {
    deleteCommentMock.mockReset()
    listMediaMock.mockReset()
    // Each comment eagerly renders its own MediaGallery — default to an
    // empty list so comment-focused assertions don't need to care about it.
    listMediaMock.mockResolvedValue([])
  })

  it('shows an empty state when there are no comments', () => {
    renderList([], 'u-owner', 'owner')
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('renders comments oldest-first with resolved author names', () => {
    renderList(
      [
        comment({ id: 'c1', author_id: 'u-owner', body: 'First comment', created_at: '2026-01-01T00:00:00.000Z' }),
        comment({ id: 'c2', author_id: 'u-member', body: 'Second comment', created_at: '2026-01-02T00:00:00.000Z' }),
      ],
      'u-owner',
      'owner',
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Owner Person')
    expect(items[0]).toHaveTextContent('First comment')
    expect(items[1]).toHaveTextContent('Member Person')
    expect(items[1]).toHaveTextContent('Second comment')
  })

  it('falls back to "Unknown member" when the author is no longer in the members list', () => {
    renderList([comment({ author_id: 'u-gone' })], 'u-owner', 'owner')
    expect(screen.getByText('Unknown member')).toBeInTheDocument()
  })

  it('shows a delete button for the comment author, even as a plain member', () => {
    renderList([comment({ author_id: 'u-member' })], 'u-member', 'member')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides the delete button for a plain member who is not the author', () => {
    renderList([comment({ author_id: 'u-owner' })], 'u-member', 'member')
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('shows a delete button for an admin on someone else\'s comment', () => {
    renderList([comment({ author_id: 'u-member' })], 'u-admin', 'admin')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('renders a media gallery and upload control under each comment', async () => {
    renderList([comment({ id: 'c1' })], 'u-owner', 'owner')

    await waitFor(() => {
      expect(listMediaMock).toHaveBeenCalledWith({ commentId: 'c1' })
    })
    expect(screen.getByRole('button', { name: /add attachment/i })).toBeInTheDocument()
  })

  it('surfaces a 403 error if a delete attempt is rejected server-side', async () => {
    deleteCommentMock.mockRejectedValue(
      new ApiError("Only the comment's author or a team owner/admin can delete it", 403),
    )
    const user = userEvent.setup()
    renderList([comment({ id: 'c1', author_id: 'u-member' })], 'u-member', 'member')

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(await screen.findByText(/only the comment's author or a team owner\/admin can delete it/i)).toBeInTheDocument()
  })
})
