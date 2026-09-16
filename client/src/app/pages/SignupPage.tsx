import { Link, useNavigate } from '@tanstack/react-router'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { SignupForm } from '../../features/auth/components/SignupForm'

export function SignupPage() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Sign up</Typography>
        <SignupForm onSuccess={() => navigate({ to: '/' })} />
        <Typography variant="body2">
          Already have an account? <Link to="/login">Log in</Link>
        </Typography>
      </Stack>
    </Container>
  )
}
