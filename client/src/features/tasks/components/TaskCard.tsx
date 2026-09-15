import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../types'
import type { Task, TaskPriority, TaskStatus } from '../types'

const PRIORITY_COLOR: Record<TaskPriority, 'default' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
}

export interface TaskCardProps {
  task: Task
  onOpen?: (task: Task) => void
  onStatusChange?: (task: Task, status: TaskStatus) => void
}

export function TaskCard({ task, onOpen, onStatusChange }: TaskCardProps) {
  const handleStatusChange = (event: SelectChangeEvent) => {
    onStatusChange?.(task, event.target.value as TaskStatus)
  }

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }} data-testid="task-card">
      <CardActionArea onClick={() => onOpen?.(task)}>
        <CardContent>
          <Typography variant="subtitle1" component="div" gutterBottom>
            {task.title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" label={task.priority} color={PRIORITY_COLOR[task.priority]} />
            {task.assigneeId && <Chip size="small" variant="outlined" label={`Assignee: ${task.assigneeId}`} />}
            {task.dueDate && (
              <Typography variant="caption" color="text.secondary">
                Due {new Date(task.dueDate).toLocaleDateString()}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
      {onStatusChange && (
        <Select
          size="small"
          fullWidth
          value={task.status}
          onChange={handleStatusChange}
          onClick={(event) => event.stopPropagation()}
          sx={{ borderTop: '1px solid', borderColor: 'divider', borderRadius: 0 }}
          inputProps={{ 'aria-label': `Move ${task.title}` }}
        >
          {TASK_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </Select>
      )}
    </Card>
  )
}
