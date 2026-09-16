import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

/**
 * Shown by TanStack Router while a route's `beforeLoad`/`loader` is still
 * in flight (e.g. a cold-load auth check against GET /auth/me), so a slow
 * network round-trip renders a spinner instead of a blank page.
 */
export function RoutePendingPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
      }}
    >
      <CircularProgress />
    </Box>
  )
}
