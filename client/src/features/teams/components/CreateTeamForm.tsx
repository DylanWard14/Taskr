import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useNavigate } from '@tanstack/react-router'
import { useCreateTeam } from '../hooks/useCreateTeam'
import { getErrorMessage } from '../../../lib/errors'
import type { Team } from '../types'

export interface CreateTeamFormProps {
  onCreated?: (team: Team) => void
}

export function CreateTeamForm({ onCreated }: CreateTeamFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const createTeam = useCreateTeam()
  const navigate = useNavigate()

  const handleClose = () => {
    setOpen(false)
    setName('')
    setValidationError(null)
    createTeam.reset()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setValidationError('Team name is required.')
      return
    }

    setValidationError(null)
    createTeam.mutate(
      { name: trimmedName },
      {
        onSuccess: (team) => {
          handleClose()
          onCreated?.(team)
          navigate({ to: '/teams/$teamId', params: { teamId: team.id } })
        },
      },
    )
  }

  const errorMessage = validationError ?? (createTeam.isError ? getErrorMessage(createTeam.error) : null)

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Create team
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <Box component="form" noValidate onSubmit={handleSubmit}>
          <DialogTitle>Create a new team</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <TextField
                label="Team name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                fullWidth
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createTeam.isPending}>
              {createTeam.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  )
}
