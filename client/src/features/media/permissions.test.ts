import { describe, expect, it } from 'vitest'
import { canDeleteMedia } from './permissions'
import type { Media } from './types'

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 'm1',
    url: '/media/m1/file',
    content_type: 'image/png',
    uploaded_by: 'u-uploader',
    task_id: 't1',
    comment_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('canDeleteMedia', () => {
  it('is true for the uploader, even as a plain member', () => {
    expect(canDeleteMedia('member', 'u-uploader', media())).toBe(true)
  })

  it('is false for a plain member who is not the uploader', () => {
    expect(canDeleteMedia('member', 'u-other', media())).toBe(false)
  })

  it('is true for an admin deleting someone else\'s upload', () => {
    expect(canDeleteMedia('admin', 'u-other', media())).toBe(true)
  })

  it('is true for an owner deleting someone else\'s upload', () => {
    expect(canDeleteMedia('owner', 'u-other', media())).toBe(true)
  })
})
