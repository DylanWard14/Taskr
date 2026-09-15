import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import type { Comment } from '../types'

export interface CommentListProps {
  comments: Comment[]
  onDelete?: (commentId: string) => void
}

export function CommentList({ comments, onDelete }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No comments yet.
      </Typography>
    )
  }

  return (
    <List aria-label="comments" disablePadding>
      {comments.map((comment) => (
        <ListItem
          key={comment.id}
          alignItems="flex-start"
          secondaryAction={
            onDelete ? (
              <Button size="small" color="error" onClick={() => onDelete(comment.id)}>
                Delete
              </Button>
            ) : undefined
          }
        >
          <ListItemAvatar>
            <Avatar>{comment.authorId.slice(0, 1).toUpperCase()}</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={comment.body}
            secondary={new Date(comment.createdAt).toLocaleString()}
          />
        </ListItem>
      ))}
    </List>
  )
}
