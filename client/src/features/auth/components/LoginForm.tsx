import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useLogin } from '../hooks/useLogin'
import { getErrorMessage, isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '../validation'

export interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const login = useLogin()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidEmail(email)) {
      setValidationError('Enter a valid email address.')
      return
    }
    if (!isValidPassword(password)) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setValidationError(null)
    login.mutate(
      { email, password },
      {
        onSuccess: () => onSuccess?.(),
      },
    )
  }

  const errorMessage = validationError ?? (login.isError ? getErrorMessage(login.error) : null)

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          fullWidth
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          fullWidth
          required
        />
        <Button type="submit" variant="contained" disabled={login.isPending} fullWidth>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </Stack>
    </Box>
  )
}
