import { describe, expect, it } from 'vitest'
import { canDeleteComment } from './permissions'
import type { Comment } from './types'

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    task_id: 't1',
    author_id: 'u-author',
    body: 'A comment',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('canDeleteComment', () => {
  it('is true for the comment author, even as a plain member', () => {
    expect(canDeleteComment('member', 'u-author', comment())).toBe(true)
  })

  it('is false for a plain member who is not the author', () => {
    expect(canDeleteComment('member', 'u-other', comment())).toBe(false)
  })

  it('is true for an admin deleting someone else\'s comment', () => {
    expect(canDeleteComment('admin', 'u-other', comment())).toBe(true)
  })

  it('is true for an owner deleting someone else\'s comment', () => {
    expect(canDeleteComment('owner', 'u-other', comment())).toBe(true)
  })
})
