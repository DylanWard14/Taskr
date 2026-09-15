import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentInput } from './CommentInput'

vi.mock('../../media/api/upload-media', () => ({
  uploadMedia: vi.fn(),
}));

const { uploadMedia } = await import('../../media/api/upload-media')

beforeEach(() => {
  vi.mocked(uploadMedia).mockReset()
})

// The project's vitest config doesn't enable test globals, so Testing
// Library's automatic afterEach cleanup isn't registered - do it explicitly.
afterEach(() => {
  cleanup()
})

describe('CommentInput', () => {
  it('does not submit an empty comment', () => {
    const onSubmit = vi.fn()
    render(<CommentInput taskId="task-1" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /post/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the typed comment body and clears the field', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CommentInput taskId="task-1" onSubmit={onSubmit} />)

    const textbox = screen.getByLabelText(/add a comment/i)
    fireEvent.change(textbox, { target: { value: 'Hello world' } })
    fireEvent.click(screen.getByRole('button', { name: /post/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ body: 'Hello world', mediaIds: undefined })
    })

    await waitFor(() => {
      expect((textbox as HTMLTextAreaElement).value).toBe('')
    })
  })

  it('uploads an attached file and includes its media id on submit', async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      id: 'media-1',
      url: '/uploads/photo.png',
      contentType: 'image/png',
      uploadedBy: 'user-1',
      taskId: 'task-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CommentInput taskId="task-1" onSubmit={onSubmit} />)

    const file = new File(['contents'], 'photo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText(/attach file/i) as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadMedia).toHaveBeenCalledWith({ file, taskId: 'task-1' })
    })
    await screen.findByText(/attached: photo\.png/i)

    fireEvent.change(screen.getByLabelText(/add a comment/i), { target: { value: 'See attached' } })
    fireEvent.click(screen.getByRole('button', { name: /post/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ body: 'See attached', mediaIds: ['media-1'] })
    })
  })

  it('shows an error message when the upload fails', async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error('Upload failed with 500'))
    render(<CommentInput taskId="task-1" onSubmit={vi.fn()} />)

    const file = new File(['contents'], 'photo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText(/attach file/i) as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    await screen.findByText(/upload failed with 500/i)
  })
})
