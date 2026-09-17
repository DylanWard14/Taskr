import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaGallery } from './MediaGallery'
import type { Media, MediaTarget } from '../types'
import type { TeamRole } from '../../teams/types'

const { listMediaMock } = vi.hoisted(() => ({ listMediaMock: vi.fn() }))

vi.mock('../api/list-media', () => ({
  listMedia: listMediaMock,
}))

// Isolate MediaGallery's own loading/error/empty/list logic from
// MediaThumbnail's rendering (covered by MediaThumbnail.test.tsx).
vi.mock('./MediaThumbnail', () => ({
  MediaThumbnail: ({ media }: { media: Media }) => <div data-testid="media-thumbnail">{media.id}</div>,
}))

function renderGallery(target: MediaTarget, viewerRole: TeamRole = 'member', enabled?: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MediaGallery target={target} viewerUserId="u1" viewerRole={viewerRole} enabled={enabled} />
    </QueryClientProvider>,
  )
}

function mediaItem(overrides: Partial<Media> = {}): Media {
  return {
    id: 'm1',
    url: '/media/m1/file',
    content_type: 'image/png',
    uploaded_by: 'u1',
    task_id: 't1',
    comment_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('MediaGallery', () => {
  beforeEach(() => {
    listMediaMock.mockReset()
  })

  it('shows an empty state when there is no media', async () => {
    listMediaMock.mockResolvedValue([])
    renderGallery({ taskId: 't1' })
    expect(await screen.findByText(/no attachments yet/i)).toBeInTheDocument()
  })

  it('renders a thumbnail per media item', async () => {
    listMediaMock.mockResolvedValue([mediaItem({ id: 'm1' }), mediaItem({ id: 'm2' })])
    renderGallery({ taskId: 't1' })

    const thumbnails = await screen.findAllByTestId('media-thumbnail')
    expect(thumbnails).toHaveLength(2)
  })

  it('shows an error state if the media list fails to load', async () => {
    listMediaMock.mockRejectedValue(new Error('Network error'))
    renderGallery({ commentId: 'c1' })

    expect(await screen.findByText(/failed to load attachments/i)).toBeInTheDocument()
  })

  it('does not fetch when disabled (deferred until a dialog is opened)', async () => {
    listMediaMock.mockResolvedValue([])
    renderGallery({ taskId: 't1' }, 'member', false)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(listMediaMock).not.toHaveBeenCalled()
  })
})
