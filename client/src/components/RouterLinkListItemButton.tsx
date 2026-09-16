import ListItemButton from '@mui/material/ListItemButton'
import { createLink } from '@tanstack/react-router'

// TanStack Router's `createLink` wraps a component so it accepts routing
// props (`to`, `params`, etc.) with full type-checking, avoiding the
// polymorphic `component={Link}` overload mismatch that occurs when passing
// TanStack Router's `Link` straight into MUI's `component` prop.
export const RouterLinkListItemButton = createLink(ListItemButton)
