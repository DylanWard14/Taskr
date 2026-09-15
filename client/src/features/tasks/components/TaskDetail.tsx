import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { updateTask } from '../api/update-task'
import { useTasks } from '../hooks/useTasks'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABELS } from '../types'
import type { TaskPriority, TaskStatus } from '../types'

export function TaskDetail() {
  const { teamId, taskId } = useParams<{ teamId: string; taskId: string }>()
  const navigate = useNavigate()
  const { tasks, isLoading, error, refetch } = useTasks(teamId)
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId])

  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setAssigneeId(task.assigneeId ?? '')
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '')
      setPriority(task.priority)
      setStatus(task.status)
    }
  }, [task])

  if (!teamId || !taskId) {
    return <Alert severity="error">Missing team or task</Alert>
  }

  if (isLoading) {
    return <CircularProgress aria-label="Loading task" />
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!task) {
    return <Alert severity="warning">Task not found</Alert>
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await updateTask(teamId, taskId, {
        assigneeId: assigneeId.trim() ? assigneeId.trim() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status,
      })
      refetch()
      navigate(`/teams/${teamId}/tasks`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="h5" gutterBottom>
        {task.title}
      </Typography>
      {task.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {task.description}
        </Typography>
      )}
      <Stack spacing={2}>
        <TextField
          label="Assignee ID"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          fullWidth
        />
        <TextField
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel id="task-detail-priority-label">Priority</InputLabel>
          <Select
            labelId="task-detail-priority-label"
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
          >
            {TASK_PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="task-detail-status-label">Status</InputLabel>
          <Select
            labelId="task-detail-status-label"
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {saveError && <Alert severity="error">{saveError}</Alert>}
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            Save
          </Button>
          <Button onClick={() => navigate(`/teams/${teamId}/tasks`)}>Cancel</Button>
        </Stack>
      </Stack>
    </Box>
  )
}
