import { useEffect, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { getErrorMessage } from '../../../lib/errors'
import { useCreateTask } from '../hooks/useCreateTask'
import { useUpdateTask } from '../hooks/useUpdateTask'
import type { Task, TaskPriority } from '../types'
import type { TeamMember } from '../../teams/types'

const UNASSIGNED = ''
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

// A date-only <input type="date"> value (yyyy-mm-dd) for editing, derived
// from the task's ISO due_date timestamp.
function toDateInputValue(dueDate: string | null | undefined): string {
  if (!dueDate) return ''
  return dueDate.slice(0, 10)
}

export interface TaskFormDialogProps {
  teamId: string
  members: TeamMember[]
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  task?: Task
}

export function TaskFormDialog({ teamId, members, open, onClose, mode, task }: TaskFormDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>(UNASSIGNED)
  const [validationError, setValidationError] = useState<string | null>(null)

  const createTask = useCreateTask(teamId)
  const updateTask = useUpdateTask(teamId)
  const mutation = mode === 'create' ? createTask : updateTask

  // Reset form fields whenever the dialog is (re)opened, seeding from the
  // task being edited when applicable. If the task's current assignee is no
  // longer a member of the team (e.g. removed since assignment), fall back
  // to "Unassigned" rather than seeding a value with no matching option —
  // otherwise the Select renders blank with a console warning.
  useEffect(() => {
    if (!open) return
    const assigneeStillAMember =
      task?.assignee_id != null && members.some((member) => member.user_id === task.assignee_id)
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'medium')
    setDueDate(toDateInputValue(task?.due_date))
    setAssigneeId(assigneeStillAMember ? task.assignee_id! : UNASSIGNED)
    setValidationError(null)
    createTask.reset()
    updateTask.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, members])

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Title is required.')
      return
    }
    setValidationError(null)

    const dueDateIso = dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : undefined

    if (mode === 'create') {
      createTask.mutate(
        {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          dueDate: dueDateIso,
          assigneeId: assigneeId || undefined,
        },
        { onSuccess: handleClose },
      )
      return
    }

    if (!task) return
    updateTask.mutate(
      {
        taskId: task.id,
        input: {
          title: trimmedTitle,
          // Unlike create, an empty string here is a meaningful "clear the
          // description" value the server will apply — updateTask only
          // ignores fields that are `undefined`, so substituting `undefined`
          // for an empty string here would silently no-op instead of
          // clearing the existing description.
          description: description.trim(),
          priority,
          // Explicit null clears the field on the server — unlike create,
          // update's schema allows this.
          dueDate: dueDateIso ?? null,
          assigneeId: assigneeId || null,
        },
      },
      { onSuccess: handleClose },
    )
  }

  const errorMessage = validationError ?? (mutation.isError ? getErrorMessage(mutation.error) : null)

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle>{mode === 'create' ? 'New task' : 'Edit task'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                fullWidth
              >
                {PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField
              select
              label="Assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              fullWidth
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value={UNASSIGNED}>Unassigned</MenuItem>
              {members.map((member) => (
                <MenuItem key={member.user_id} value={member.user_id}>
                  {member.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
