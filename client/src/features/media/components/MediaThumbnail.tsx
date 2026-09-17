import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getErrorMessage } from '../../../lib/errors'
import { useDeleteMedia } from '../hooks/useDeleteMedia'
import { useMediaImageUrl } from '../hooks/useMediaImageUrl'
import { canDeleteMedia } from '../permissions'
import type { Media, MediaTarget } from '../types'
import type { TeamRole } from '../../teams/types'

export interface MediaThumbnailProps {
  media: Media
  target: MediaTarget
  viewerUserId: string
  viewerRole: TeamRole
}

export function MediaThumbnail({ media, target, viewerUserId, viewerRole }: MediaThumbnailProps) {
  const { url, isLoading, isError } = useMediaImageUrl(media.id)
  const deleteMedia = useDeleteMedia(target)
  const [actionError, setActionError] = useState<string | null>(null)
  const canDelete = canDeleteMedia(viewerRole, viewerUserId, media)

  const handleDelete = () => {
    setActionError(null)
    deleteMedia.mutate(media.id, {
      onError: (error) => setActionError(getErrorMessage(error)),
    })
  }

  return (
    <Stack spacing={0.5} sx={{ width: 96 }}>
      <Box
        sx={{
          width: 96,
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {isLoading && <CircularProgress size={24} />}
        {!isLoading && isError && (
          <Typography variant="caption" color="error" align="center">
            Failed to load
          </Typography>
        )}
        {!isLoading && !isError && url && (
          <Box
            component="img"
            src={url}
            alt="Attachment"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>
      {actionError && (
        <Alert severity="error" sx={{ fontSize: '0.7rem', p: 0.5 }}>
          {actionError}
        </Alert>
      )}
      {canDelete && (
        <Button size="small" color="error" onClick={handleDelete} disabled={deleteMedia.isPending}>
          Delete
        </Button>
      )}
    </Stack>
  )
}
