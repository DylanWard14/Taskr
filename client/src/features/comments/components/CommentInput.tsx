import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { getErrorMessage } from '../../../lib/errors'
import { useCreateComment } from '../hooks/useCreateComment'

export interface CommentInputProps {
  taskId: string
}

export function CommentInput({ taskId }: CommentInputProps) {
  const [body, setBody] = useState('')
  const createComment = useCreateComment(taskId)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedBody = body.trim()
    if (!trimmedBody) {
      return
    }

    createComment.mutate(
      { body: trimmedBody },
      { onSuccess: () => setBody('') },
    )
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={1}>
        {createComment.isError && <Alert severity="error">{getErrorMessage(createComment.error)}</Alert>}
        <TextField
          label="Add a comment"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <Box>
          <Button type="submit" variant="contained" disabled={createComment.isPending || !body.trim()}>
            {createComment.isPending ? 'Posting…' : 'Post comment'}
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
