import { useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { StatusColumn } from './StatusColumn'
import { useTasks } from '../hooks/useTasks'
import { useUpdateTaskStatus } from '../hooks/useUpdateTaskStatus'
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../types'
import type { Task, TaskStatus } from '../types'

export function TaskBoard() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { tasks, isLoading, error, refetch } = useTasks(teamId)
  const { updateStatus } = useUpdateTaskStatus(teamId)

  if (!teamId) {
    return <Alert severity="error">No team selected</Alert>
  }

  const handleOpenTask = (task: Task) => {
    navigate(`/teams/${teamId}/tasks/${task.id}`)
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      await updateStatus(task.id, status)
    } finally {
      refetch()
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>
      {isLoading && <CircularProgress aria-label="Loading tasks" />}
      {error && <Alert severity="error">{error}</Alert>}
      {!isLoading && !error && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          {TASK_STATUSES.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              title={TASK_STATUS_LABELS[status]}
              tasks={tasks.filter((task) => task.status === status)}
              onOpenTask={handleOpenTask}
              onStatusChange={handleStatusChange}
            />
          ))}
        </Stack>
      )}
    </Box>
  )
}
