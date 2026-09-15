import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import { useTeams } from '../hooks/useTeams'

export interface TeamSwitcherProps {
  activeTeamId?: string
  onChangeTeam: (teamId: string) => void
}

export function TeamSwitcher({ activeTeamId, onChangeTeam }: TeamSwitcherProps) {
  const { teams, isLoading } = useTeams()

  const handleChange = (event: SelectChangeEvent) => {
    onChangeTeam(event.target.value)
  }

  return (
    <FormControl size="small" sx={{ minWidth: 200 }} disabled={isLoading || teams.length === 0}>
      <InputLabel id="team-switcher-label">Team</InputLabel>
      <Select
        labelId="team-switcher-label"
        label="Team"
        value={activeTeamId ?? ''}
        onChange={handleChange}
        displayEmpty
      >
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>
            {team.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
