import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useMedia } from '../hooks/useMedia'
import { MediaThumbnail } from './MediaThumbnail'
import type { MediaTarget } from '../types'
import type { TeamRole } from '../../teams/types'

export interface MediaGalleryProps {
  target: MediaTarget
  viewerUserId: string
  viewerRole: TeamRole
  // Lets callers (e.g. a TaskCard's Attachments dialog) defer fetching until
  // the gallery is actually shown — mirrors useMedia's own `enabled` option.
  enabled?: boolean
}

export function MediaGallery({ target, viewerUserId, viewerRole, enabled }: MediaGalleryProps) {
  const mediaQuery = useMedia(target, { enabled })

  if (mediaQuery.isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading attachments…
      </Typography>
    )
  }

  if (mediaQuery.isError) {
    return <Alert severity="error">Failed to load attachments. Please try again.</Alert>
  }

  const media = mediaQuery.data ?? []

  if (media.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No attachments yet.
      </Typography>
    )
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {media.map((item) => (
        <MediaThumbnail key={item.id} media={item} target={target} viewerUserId={viewerUserId} viewerRole={viewerRole} />
      ))}
    </Stack>
  )
}
