import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getErrorMessage } from '../../../lib/errors'
import { MediaGallery } from '../../media/components/MediaGallery'
import { MediaUploadButton } from '../../media/components/MediaUploadButton'
import { useDeleteComment } from '../hooks/useDeleteComment'
import { canDeleteComment } from '../permissions'
import type { Comment } from '../types'
import type { TeamMember, TeamRole } from '../../teams/types'

export interface CommentListProps {
  taskId: string
  comments: Comment[]
  members: TeamMember[]
  viewerUserId: string
  viewerRole: TeamRole
}

// Comments are expected to already be ordered oldest-first, matching the
// server's GET /tasks/:taskId/comments (orderBy created_at asc) — rendered
// as-is rather than re-sorted client-side.
export function CommentList({ taskId, comments, members, viewerUserId, viewerRole }: CommentListProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const deleteComment = useDeleteComment(taskId)

  const handleDelete = (commentId: string) => {
    setActionError(null)
    deleteComment.mutate(commentId, {
      onError: (error) => setActionError(getErrorMessage(error)),
    })
  }

  if (comments.length === 0) {
    return (
      <Stack spacing={1}>
        {actionError && <Alert severity="error">{actionError}</Alert>}
        <Typography variant="body2" color="text.secondary">
          No comments yet.
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={1}>
      {actionError && <Alert severity="error">{actionError}</Alert>}
      <List disablePadding>
        {comments.map((comment) => {
          const author = members.find((member) => member.user_id === comment.author_id)
          const canDelete = canDeleteComment(viewerRole, viewerUserId, comment)

          return (
            <ListItem
              key={comment.id}
              divider
              alignItems="flex-start"
              secondaryAction={
                canDelete && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deleteComment.isPending}
                  >
                    Delete
                  </Button>
                )
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="subtitle2" component="span">
                      {author ? author.name : 'Unknown member'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {new Date(comment.created_at).toLocaleString()}
                    </Typography>
                  </Stack>
                }
                secondary={
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                      {comment.body}
                    </Typography>
                    <MediaGallery target={{ commentId: comment.id }} viewerUserId={viewerUserId} viewerRole={viewerRole} />
                    <MediaUploadButton target={{ commentId: comment.id }} />
                  </Stack>
                }
                slotProps={{ secondary: { component: 'div' } }}
              />
            </ListItem>
          )
        })}
      </List>
    </Stack>
  )
}
