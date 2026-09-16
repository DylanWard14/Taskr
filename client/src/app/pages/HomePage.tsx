import { useNavigate } from '@tanstack/react-router'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useAuth } from '../../features/auth/hooks/useCurrentUser'
import { useLogout } from '../../features/auth/hooks/useLogout'

export function HomePage() {
  const { user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Signed in as {user?.name}</Typography>
        <Button variant="outlined" onClick={handleLogout} sx={{ alignSelf: 'flex-start' }}>
          Log out
        </Button>
      </Stack>
    </Container>
  )
}
