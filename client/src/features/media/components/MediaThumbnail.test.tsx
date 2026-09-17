import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaThumbnail } from './MediaThumbnail'
import { ApiError } from '../../../lib/api-client'
import type { Media } from '../types'

const { deleteMediaMock, useMediaImageUrlMock } = vi.hoisted(() => ({
  deleteMediaMock: vi.fn(),
  useMediaImageUrlMock: vi.fn(),
}))

vi.mock('../api/delete-media', () => ({
  deleteMedia: deleteMediaMock,
}))

// The object-URL lifecycle is exercised directly in useMediaImageUrl.test.tsx —
// here we mock it so this component's tests focus on rendering/permissions.
vi.mock('../hooks/useMediaImageUrl', () => ({
  useMediaImageUrl: useMediaImageUrlMock,
}))

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

function renderThumbnail(mediaItem: Media, viewerUserId: string, viewerRole: 'owner' | 'admin' | 'member') {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MediaThumbnail media={mediaItem} target={{ taskId: 't1' }} viewerUserId={viewerUserId} viewerRole={viewerRole} />
    </QueryClientProvider>,
  )
}

describe('MediaThumbnail', () => {
  beforeEach(() => {
    deleteMediaMock.mockReset()
    useMediaImageUrlMock.mockReset()
  })

  it('shows a loading state while the image is being fetched', () => {
    useMediaImageUrlMock.mockReturnValue({ url: null, isLoading: true, isError: false })
    renderThumbnail(media(), 'u-uploader', 'member')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders the image once the object URL is ready', () => {
    useMediaImageUrlMock.mockReturnValue({ url: 'blob:mock-url', isLoading: false, isError: false })
    renderThumbnail(media(), 'u-uploader', 'member')
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:mock-url')
  })

  it('shows an error state when the image fetch fails (e.g. a stale 404)', () => {
    useMediaImageUrlMock.mockReturnValue({ url: null, isLoading: false, isError: true })
    renderThumbnail(media(), 'u-uploader', 'member')
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('shows a delete button for the uploader, even as a plain member', () => {
    useMediaImageUrlMock.mockReturnValue({ url: 'blob:mock-url', isLoading: false, isError: false })
    renderThumbnail(media({ uploaded_by: 'u-member' }), 'u-member', 'member')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides the delete button for a plain member who is not the uploader', () => {
    useMediaImageUrlMock.mockReturnValue({ url: 'blob:mock-url', isLoading: false, isError: false })
    renderThumbnail(media({ uploaded_by: 'u-other' }), 'u-member', 'member')
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('shows a delete button for an admin on someone else\'s upload', () => {
    useMediaImageUrlMock.mockReturnValue({ url: 'blob:mock-url', isLoading: false, isError: false })
    renderThumbnail(media({ uploaded_by: 'u-member' }), 'u-admin', 'admin')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('surfaces a 403 error if a delete attempt is rejected server-side', async () => {
    useMediaImageUrlMock.mockReturnValue({ url: 'blob:mock-url', isLoading: false, isError: false })
    deleteMediaMock.mockRejectedValue(
      new ApiError('Only the uploader or a team owner/admin can delete this media', 403),
    )
    const user = userEvent.setup()
    renderThumbnail(media({ uploaded_by: 'u-member' }), 'u-member', 'member')

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(
      await screen.findByText(/only the uploader or a team owner\/admin can delete this media/i),
    ).toBeInTheDocument()
  })
})
