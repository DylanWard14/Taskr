import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaUploadButton } from './MediaUploadButton'
import { ApiError } from '../../../lib/api-client'

const { uploadMediaMock } = vi.hoisted(() => ({ uploadMediaMock: vi.fn() }))

vi.mock('../api/upload-media', () => ({
  uploadMedia: uploadMediaMock,
}))

function renderButton() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MediaUploadButton target={{ taskId: 't1' }} />
    </QueryClientProvider>,
  )
}

function selectFile(input: HTMLElement, file: File) {
  return userEvent.setup().upload(input, file)
}

describe('MediaUploadButton', () => {
  beforeEach(() => {
    uploadMediaMock.mockReset()
  })

  it('uploads a valid image file selected via the hidden input', async () => {
    uploadMediaMock.mockResolvedValue({
      id: 'm1',
      url: '/media/m1/file',
      content_type: 'image/png',
      uploaded_by: 'u1',
      task_id: 't1',
      comment_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    renderButton()

    const file = new File(['bytes'], 'photo.png', { type: 'image/png' })
    await selectFile(screen.getByTestId('media-file-input'), file)

    await waitFor(() => {
      expect(uploadMediaMock).toHaveBeenCalledWith({ taskId: 't1', file })
    })
  })

  it('rejects a non-image file client-side without calling the API', async () => {
    renderButton()

    // userEvent.upload enforces the input's `accept` attribute itself (so it
    // won't select a mismatched file at all) — fireEvent bypasses that to
    // exercise this component's own validation logic directly.
    const file = new File(['not an image'], 'notes.txt', { type: 'text/plain' })
    const input = screen.getByTestId('media-file-input') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    expect(await screen.findByText(/only png, jpeg, gif, or webp images are supported/i)).toBeInTheDocument()
    expect(uploadMediaMock).not.toHaveBeenCalled()
  })

  it('rejects an oversized file client-side without calling the API', async () => {
    renderButton()

    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await selectFile(screen.getByTestId('media-file-input'), oversized)

    expect(await screen.findByText(/exceeds the maximum upload size of 5mb/i)).toBeInTheDocument()
    expect(uploadMediaMock).not.toHaveBeenCalled()
  })

  it('surfaces a server-side rejection (e.g. spoofed content-type)', async () => {
    uploadMediaMock.mockRejectedValue(new ApiError('File contents do not match the declared image type', 400))
    renderButton()

    const file = new File(['bytes'], 'photo.png', { type: 'image/png' })
    await selectFile(screen.getByTestId('media-file-input'), file)

    expect(await screen.findByText(/file contents do not match the declared image type/i)).toBeInTheDocument()
  })

  it('surfaces a 413 too-large rejection from the server', async () => {
    uploadMediaMock.mockRejectedValue(new ApiError('File exceeds the maximum upload size of 5MB', 413))
    renderButton()

    const file = new File(['bytes'], 'photo.png', { type: 'image/png' })
    await selectFile(screen.getByTestId('media-file-input'), file)

    expect(await screen.findByText(/file exceeds the maximum upload size of 5mb/i)).toBeInTheDocument()
  })

  it('surfaces a 404 not-a-member rejection from the server', async () => {
    uploadMediaMock.mockRejectedValue(new ApiError('Task not found', 404))
    renderButton()

    const file = new File(['bytes'], 'photo.png', { type: 'image/png' })
    await selectFile(screen.getByTestId('media-file-input'), file)

    expect(await screen.findByText(/task not found/i)).toBeInTheDocument()
  })
})
