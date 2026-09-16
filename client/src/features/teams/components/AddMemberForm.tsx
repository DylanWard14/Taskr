import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getErrorMessage } from '../../../lib/errors'
import { useAddTeamMember } from '../hooks/useAddTeamMember'
import { assignableRoles } from '../permissions'
import type { TeamRole } from '../types'

export interface AddMemberFormProps {
  teamId: string
  viewerRole: TeamRole
}

export function AddMemberForm({ teamId, viewerRole }: AddMemberFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('member')
  const [validationError, setValidationError] = useState<string | null>(null)
  const addMember = useAddTeamMember(teamId)
  const roles = assignableRoles(viewerRole)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setValidationError('Email is required.')
      return
    }

    setValidationError(null)
    addMember.mutate(
      { email: trimmedEmail, role },
      {
        onSuccess: () => {
          setEmail('')
          setRole('member')
        },
      },
    )
  }

  const errorMessage = validationError ?? (addMember.isError ? getErrorMessage(addMember.error) : null)

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">Add a member</Typography>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {addMember.isSuccess && <Alert severity="success">Member added.</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            required
          />
          <TextField
            select
            label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value as TeamRole)}
            sx={{ minWidth: 140 }}
          >
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained" disabled={addMember.isPending}>
            {addMember.isPending ? 'Adding…' : 'Add member'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
