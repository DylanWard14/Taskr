import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../hooks/useAuth'

export function LoginForm() {
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await login(email, password)
      navigate('/')
    } catch {
      // error state is already surfaced by useAuth
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 4, sm: 8 }, px: 2 }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ p: 4, width: '100%', maxWidth: 400 }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Sign in
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          fullWidth
          required
          margin="normal"
          autoComplete="email"
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          fullWidth
          required
          margin="normal"
          autoComplete="current-password"
        />

        <Button type="submit" variant="contained" fullWidth disabled={isLoading} sx={{ mt: 3 }}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Paper>
    </Box>
  )
}
