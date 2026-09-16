import { useState, type MouseEvent } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useNavigate } from '@tanstack/react-router'
import { useTeams } from '../hooks/useTeams'

export interface TeamSwitcherProps {
  currentTeamId: string
}

export function TeamSwitcher({ currentTeamId }: TeamSwitcherProps) {
  const { data: teams } = useTeams()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const navigate = useNavigate()

  const otherTeams = (teams ?? []).filter((team) => team.id !== currentTeamId)

  if (otherTeams.length === 0) {
    return null
  }

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)

  return (
    <>
      <Button variant="outlined" size="small" onClick={handleOpen} aria-haspopup="true">
        Switch team
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {otherTeams.map((team) => (
          <MenuItem
            key={team.id}
            onClick={() => {
              handleClose()
              navigate({ to: '/teams/$teamId', params: { teamId: team.id } })
            }}
          >
            {team.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
