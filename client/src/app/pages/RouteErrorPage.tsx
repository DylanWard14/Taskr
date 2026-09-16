import type { ErrorComponentProps } from '@tanstack/react-router'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

/**
 * Shown when a route's `beforeLoad`/`loader` throws an unexpected error
 * (e.g. GET /auth/me fails with a 500 or a network error) rather than a
 * recognized "logged out" 401. A generic, reloadable message is more useful
 * than TanStack Router's default error boundary output.
 */
export function RouteErrorPage(_props: ErrorComponentProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Alert severity="error">
          <AlertTitle>Something went wrong</AlertTitle>
          Please try reloading the page.
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()} sx={{ alignSelf: 'flex-start' }}>
          Reload
        </Button>
      </Stack>
    </Container>
  )
}
