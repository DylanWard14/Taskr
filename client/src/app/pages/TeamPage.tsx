import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../features/auth/hooks/useCurrentUser'
import { AddMemberForm } from '../../features/teams/components/AddMemberForm'
import { TeamMembersList } from '../../features/teams/components/TeamMembersList'
import { TeamSwitcher } from '../../features/teams/components/TeamSwitcher'
import { useTeam } from '../../features/teams/hooks/useTeam'
import { useTeamMembers } from '../../features/teams/hooks/useTeamMembers'
import { canManageMembers } from '../../features/teams/permissions'
import { ApiError } from '../../lib/api-client'
import { teamRoute } from '../routes'

export function TeamPage() {
  const { teamId } = teamRoute.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const teamQuery = useTeam(teamId)
  const membersQuery = useTeamMembers(teamId, { enabled: teamQuery.isSuccess })

  if (teamQuery.isLoading || membersQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (teamQuery.isError) {
    const notFound = teamQuery.error instanceof ApiError && teamQuery.error.status === 404
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity={notFound ? 'warning' : 'error'}>
          {notFound
            ? "This team doesn't exist, or you're not a member of it."
            : 'Failed to load this team. Please try again.'}
        </Alert>
      </Container>
    )
  }

  if (membersQuery.isError || !teamQuery.data || !membersQuery.data || !user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">Failed to load this team. Please try again.</Alert>
      </Container>
    )
  }

  const team = teamQuery.data
  const members = membersQuery.data
  const viewerMembership = members.find((member) => member.user_id === user.id)
  const viewerRole = viewerMembership?.role ?? 'member'

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">{team.name}</Typography>
          <TeamSwitcher currentTeamId={team.id} />
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Members
          </Typography>
          <TeamMembersList
            teamId={team.id}
            members={members}
            viewerUserId={user.id}
            viewerRole={viewerRole}
            onLeave={() => navigate({ to: '/' })}
          />
          {canManageMembers(viewerRole) && (
            <>
              <Divider sx={{ my: 2 }} />
              <AddMemberForm teamId={team.id} viewerRole={viewerRole} />
            </>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Tasks board coming soon.</Typography>
        </Paper>
      </Stack>
    </Container>
  )
}
