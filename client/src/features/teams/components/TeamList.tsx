import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { RouterLinkListItemButton } from '../../../components/RouterLinkListItemButton'
import { useTeams } from '../hooks/useTeams'

export function TeamList() {
  const { data: teams, isLoading, isError } = useTeams()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error">Failed to load your teams.</Alert>
  }

  if (!teams || teams.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" gutterBottom>
          You aren&apos;t a member of any teams yet.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create a team to get started.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined">
      <List disablePadding>
        {teams.map((team) => (
          <RouterLinkListItemButton key={team.id} to="/teams/$teamId" params={{ teamId: team.id }}>
            <ListItemText primary={team.name} />
          </RouterLinkListItemButton>
        ))}
      </List>
    </Paper>
  )
}
