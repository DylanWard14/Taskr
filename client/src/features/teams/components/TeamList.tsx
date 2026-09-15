import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { useTeams } from '../hooks/useTeams'

export interface TeamListProps {
  onSelectTeam?: (teamId: string) => void
}

export function TeamList({ onSelectTeam }: TeamListProps) {
  const { teams, isLoading, error } = useTeams()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress aria-label="Loading teams" />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (teams.length === 0) {
    return <Typography color="text.secondary">You are not a member of any teams yet.</Typography>
  }

  return (
    <List aria-label="Your teams">
      {teams.map((team) => (
        <ListItemButton key={team.id} onClick={() => onSelectTeam?.(team.id)}>
          <ListItemText primary={team.name} />
        </ListItemButton>
      ))}
    </List>
  )
}
