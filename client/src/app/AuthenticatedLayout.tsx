import { Outlet, useNavigate } from '@tanstack/react-router'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useAuth } from '../features/auth/hooks/useCurrentUser'
import { useLogout } from '../features/auth/hooks/useLogout'

/**
 * App shell rendered for every authenticated route (see the pathless
 * `authenticatedRoute` in routes.tsx that owns the auth guard). Keeps the top
 * bar (app name, current user, logout) persistent across navigation instead
 * of each page re-implementing it.
 */
export function AuthenticatedLayout() {
  const { user } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            Taskr
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            {user && <Typography variant="body2">Signed in as {user.name}</Typography>}
            <Button color="inherit" variant="outlined" size="small" onClick={handleLogout}>
              Log out
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Outlet />
    </Box>
  )
}
