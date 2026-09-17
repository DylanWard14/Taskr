import { useRef, useState, type ChangeEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { getErrorMessage } from '../../../lib/errors'
import { useUploadMedia } from '../hooks/useUploadMedia'
import type { MediaTarget } from '../types'

// Mirrors the server's allowlist/size cap (server/src/modules/media/service.ts)
// so an obviously-invalid file gets immediate feedback without a round trip
// — the server remains the real source of truth (it also verifies the
// file's actual magic bytes, which the client can't do), and its rejections
// are still surfaced below.
const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export interface MediaUploadButtonProps {
  target: MediaTarget
}

export function MediaUploadButton({ target }: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const uploadMedia = useUploadMedia(target)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset so selecting the same file again still fires a change event.
    event.target.value = ''
    if (!file) {
      return
    }

    setValidationError(null)

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      setValidationError('Only PNG, JPEG, GIF, or WebP images are supported.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError('File exceeds the maximum upload size of 5MB.')
      return
    }

    uploadMedia.mutate(file)
  }

  return (
    <Stack spacing={1}>
      {validationError && <Alert severity="error">{validationError}</Alert>}
      {uploadMedia.isError && <Alert severity="error">{getErrorMessage(uploadMedia.error)}</Alert>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="media-file-input"
      />
      <Button
        size="small"
        variant="outlined"
        onClick={() => inputRef.current?.click()}
        disabled={uploadMedia.isPending}
      >
        {uploadMedia.isPending ? 'Uploading…' : 'Add attachment'}
      </Button>
    </Stack>
  )
}
