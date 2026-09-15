import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { TaskCard } from './TaskCard'
import type { Task, TaskStatus } from '../types'

export interface StatusColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  onOpenTask?: (task: Task) => void
  onStatusChange?: (task: Task, status: TaskStatus) => void
}

export function StatusColumn({ status, title, tasks, onOpenTask, onStatusChange }: StatusColumnProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, flex: 1, minWidth: 0, bgcolor: 'grey.50' }}
      data-testid={`status-column-${status}`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {tasks.length}
        </Typography>
      </Stack>
      <Box>
        {tasks.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No tasks
          </Typography>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={onOpenTask} onStatusChange={onStatusChange} />
        ))}
      </Box>
    </Paper>
  )
}
