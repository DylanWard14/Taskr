import { Link, useNavigate } from '@tanstack/react-router'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { LoginForm } from '../../features/auth/components/LoginForm'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Log in</Typography>
        <LoginForm onSuccess={() => navigate({ to: '/' })} />
        <Typography variant="body2">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </Typography>
      </Stack>
    </Container>
  )
}
