import { useState, type MouseEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CommentInput } from '../../comments/components/CommentInput'
import { CommentList } from '../../comments/components/CommentList'
import { useComments } from '../../comments/hooks/useComments'
import { MediaGallery } from '../../media/components/MediaGallery'
import { MediaUploadButton } from '../../media/components/MediaUploadButton'
import { getErrorMessage } from '../../../lib/errors'
import { useDeleteTask } from '../hooks/useDeleteTask'
import { useUpdateTask } from '../hooks/useUpdateTask'
import { canDeleteTask } from '../permissions'
import { TaskFormDialog } from './TaskFormDialog'
import type { Task, TaskStatus } from '../types'
import type { TeamMember, TeamRole } from '../../teams/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  done: 'Done',
}

const ALL_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']

const PRIORITY_COLORS: Record<Task['priority'], 'default' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
}

export interface TaskCardProps {
  teamId: string
  task: Task
  members: TeamMember[]
  viewerRole: TeamRole
  viewerUserId: string
}

export function TaskCard({ teamId, task, members, viewerRole, viewerUserId }: TaskCardProps) {
  const [moveAnchorEl, setMoveAnchorEl] = useState<HTMLElement | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const updateTask = useUpdateTask(teamId)
  const deleteTask = useDeleteTask(teamId)
  // Deferred until the dialog is actually opened, so a board with N cards
  // doesn't fire N comment-count queries up front.
  const commentsQuery = useComments(task.id, { enabled: commentsOpen })

  const assignee = members.find((member) => member.user_id === task.assignee_id)
  const otherStatuses = ALL_STATUSES.filter((status) => status !== task.status)

  const handleOpenMove = (event: MouseEvent<HTMLElement>) => setMoveAnchorEl(event.currentTarget)
  const handleCloseMove = () => setMoveAnchorEl(null)

  const handleMove = (status: TaskStatus) => {
    handleCloseMove()
    setActionError(null)
    updateTask.mutate(
      { taskId: task.id, input: { status } },
      { onError: (error) => setActionError(getErrorMessage(error)) },
    )
  }

  const handleDelete = () => {
    setActionError(null)
    deleteTask.mutate(task.id, {
      onError: (error) => setActionError(getErrorMessage(error)),
    })
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          {actionError && <Alert severity="error">{actionError}</Alert>}
          <Typography variant="subtitle1">{task.title}</Typography>
          {task.description && (
            <Typography variant="body2" color="text.secondary">
              {task.description}
            </Typography>
          )}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              size="small"
              label={task.priority}
              color={PRIORITY_COLORS[task.priority]}
            />
            <Typography variant="body2" color="text.secondary">
              {assignee ? assignee.name : 'Unassigned'}
            </Typography>
          </Stack>
          {task.due_date && (
            <Typography variant="caption" color="text.secondary">
              Due {new Date(task.due_date).toLocaleDateString()}
            </Typography>
          )}
        </Stack>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={handleOpenMove} disabled={updateTask.isPending}>
          Move to…
        </Button>
        <Menu anchorEl={moveAnchorEl} open={Boolean(moveAnchorEl)} onClose={handleCloseMove}>
          {otherStatuses.map((status) => (
            <MenuItem key={status} onClick={() => handleMove(status)}>
              {STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </Menu>
        <Button size="small" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        {canDeleteTask(viewerRole) && (
          <Button size="small" color="error" onClick={handleDelete} disabled={deleteTask.isPending}>
            Delete
          </Button>
        )}
        <Button size="small" onClick={() => setCommentsOpen(true)}>
          Comments{commentsQuery.data ? ` (${commentsQuery.data.length})` : ''}
        </Button>
        <Button size="small" onClick={() => setAttachmentsOpen(true)}>
          Attachments
        </Button>
      </CardActions>
      <TaskFormDialog
        teamId={teamId}
        members={members}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        task={task}
      />
      <Dialog open={commentsOpen} onClose={() => setCommentsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Comments — {task.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {commentsQuery.isLoading && (
              <Typography variant="body2" color="text.secondary">
                Loading comments…
              </Typography>
            )}
            {commentsQuery.isError && <Alert severity="error">Failed to load comments. Please try again.</Alert>}
            {commentsQuery.data && (
              <CommentList
                taskId={task.id}
                comments={commentsQuery.data}
                members={members}
                viewerUserId={viewerUserId}
                viewerRole={viewerRole}
              />
            )}
            <Divider />
            <CommentInput taskId={task.id} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={attachmentsOpen} onClose={() => setAttachmentsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Attachments — {task.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <MediaGallery
              target={{ taskId: task.id }}
              viewerUserId={viewerUserId}
              viewerRole={viewerRole}
              enabled={attachmentsOpen}
            />
            <Divider />
            <MediaUploadButton target={{ taskId: task.id }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachmentsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
