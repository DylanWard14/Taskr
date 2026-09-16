import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTasks } from '../hooks/useTasks'
import { StatusColumn } from './StatusColumn'
import { TaskFormDialog } from './TaskFormDialog'
import type { Task, TaskStatus } from '../types'
import type { TeamMember, TeamRole } from '../../teams/types'

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'Todo' },
  { status: 'in-progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
]

function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], 'in-progress': [], done: [] }
  for (const task of tasks) {
    groups[task.status].push(task)
  }
  return groups
}

export interface TaskBoardProps {
  teamId: string
  members: TeamMember[]
  viewerRole: TeamRole
}

export function TaskBoard({ teamId, members, viewerRole }: TaskBoardProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const tasksQuery = useTasks(teamId)

  if (tasksQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (tasksQuery.isError || !tasksQuery.data) {
    return <Alert severity="error">Failed to load tasks. Please try again.</Alert>
  }

  const groups = groupByStatus(tasksQuery.data)

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Tasks</Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          New task
        </Button>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {COLUMNS.map((column) => (
          <StatusColumn
            key={column.status}
            teamId={teamId}
            status={column.status}
            title={column.title}
            tasks={groups[column.status]}
            members={members}
            viewerRole={viewerRole}
          />
        ))}
      </Stack>
      <TaskFormDialog
        teamId={teamId}
        members={members}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </Stack>
  )
}
