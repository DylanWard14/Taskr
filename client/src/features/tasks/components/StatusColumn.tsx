import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { TaskCard } from './TaskCard'
import type { Task, TaskStatus } from '../types'
import type { TeamMember, TeamRole } from '../../teams/types'

export interface StatusColumnProps {
  teamId: string
  status: TaskStatus
  title: string
  tasks: Task[]
  members: TeamMember[]
  viewerRole: TeamRole
}

export function StatusColumn({ teamId, title, tasks, members, viewerRole }: StatusColumnProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
      <Typography variant="h6" gutterBottom>
        {title} ({tasks.length})
      </Typography>
      <Stack spacing={2}>
        {tasks.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No tasks here.
          </Typography>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} teamId={teamId} task={task} members={members} viewerRole={viewerRole} />
        ))}
      </Stack>
    </Paper>
  )
}
