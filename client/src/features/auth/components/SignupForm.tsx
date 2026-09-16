import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useSignup } from '../hooks/useSignup'
import { getErrorMessage, isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '../validation'

export interface SignupFormProps {
  onSuccess?: () => void
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const signup = useSignup()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (name.trim().length === 0) {
      setValidationError('Name is required.')
      return
    }
    if (!isValidEmail(email)) {
      setValidationError('Enter a valid email address.')
      return
    }
    if (!isValidPassword(password)) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setValidationError(null)
    signup.mutate(
      { name, email, password },
      {
        onSuccess: () => onSuccess?.(),
      },
    )
  }

  const errorMessage = validationError ?? (signup.isError ? getErrorMessage(signup.error) : null)

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          fullWidth
          required
        />
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
          autoComplete="new-password"
          fullWidth
          required
        />
        <Button type="submit" variant="contained" disabled={signup.isPending} fullWidth>
          {signup.isPending ? 'Signing up…' : 'Sign up'}
        </Button>
      </Stack>
    </Box>
  )
}
