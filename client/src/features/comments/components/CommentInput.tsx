import { useState, type ChangeEvent, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { uploadMedia } from '../../media/api/upload-media'
import type { CreateCommentInput } from '../types'

export interface CommentInputProps {
  taskId: string
  onSubmit: (input: CreateCommentInput) => Promise<void> | void
}

export function CommentInput({ taskId, onSubmit }: CommentInputProps) {
  const [body, setBody] = useState('')
  const [pendingMediaIds, setPendingMediaIds] = useState<string[]>([])
  const [attachedFileNames, setAttachedFileNames] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setUploading(true)
    setError(null)
    try {
      const media = await uploadMedia({ file, taskId })
      setPendingMediaIds((prev) => [...prev, media.id])
      setAttachedFileNames((prev) => [...prev, file.name])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        body: trimmed,
        mediaIds: pendingMediaIds.length > 0 ? pendingMediaIds : undefined,
      })
      setBody('')
      setPendingMediaIds([])
      setAttachedFileNames([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={1}>
        <TextField
          label="Add a comment"
          multiline
          minRows={2}
          fullWidth
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        {attachedFileNames.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            Attached: {attachedFileNames.join(', ')}
          </Typography>
        )}
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" component="label" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Attach file'}
            <input type="file" hidden onChange={handleFileChange} aria-label="Attach file" />
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || !body.trim()}>
            {submitting ? <CircularProgress size={20} /> : 'Post'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
