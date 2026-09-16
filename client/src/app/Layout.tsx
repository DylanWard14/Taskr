import { Outlet } from '@tanstack/react-router'
import Box from '@mui/material/Box'

export function Layout() {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Outlet />
    </Box>
  )
}
