import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CreateTeamForm } from '../../features/teams/components/CreateTeamForm'
import { TeamList } from '../../features/teams/components/TeamList'

export function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Your teams</Typography>
          <CreateTeamForm />
        </Stack>
        <TeamList />
      </Stack>
    </Container>
  )
}
