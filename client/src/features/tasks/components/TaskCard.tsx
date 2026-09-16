import { useState, type MouseEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
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
}

export function TaskCard({ teamId, task, members, viewerRole }: TaskCardProps) {
  const [moveAnchorEl, setMoveAnchorEl] = useState<HTMLElement | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const updateTask = useUpdateTask(teamId)
  const deleteTask = useDeleteTask(teamId)

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
      </CardActions>
      <TaskFormDialog
        teamId={teamId}
        members={members}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        task={task}
      />
    </Card>
  )
}
