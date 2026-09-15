import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamSwitcher } from './TeamSwitcher'
import { useTeams } from '../hooks/useTeams'
import type { UseTeamsResult } from '../hooks/useTeams'

vi.mock('../hooks/useTeams')

const mockUseTeams = vi.mocked(useTeams)

function mockTeamsResult(overrides: Partial<UseTeamsResult>): UseTeamsResult {
  return {
    teams: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  }
}

describe('TeamSwitcher', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mockUseTeams.mockReset()
    mockUseTeams.mockReturnValue(
      mockTeamsResult({
        teams: [
          { id: 'team-1', name: 'Team One' },
          { id: 'team-2', name: 'Team Two' },
        ],
      }),
    )
  })

  it('shows the active team as the selected value', () => {
    render(<TeamSwitcher activeTeamId="team-1" onChangeTeam={vi.fn()} />)

    expect(screen.getByText('Team One')).toBeInTheDocument()
  })

  it('calls onChangeTeam when a different team is picked', () => {
    const onChangeTeam = vi.fn()
    render(<TeamSwitcher activeTeamId="team-1" onChangeTeam={onChangeTeam} />)

    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'Team Two' }))

    expect(onChangeTeam).toHaveBeenCalledWith('team-2')
  })

  it('disables the control while teams are loading', () => {
    mockUseTeams.mockReturnValue(mockTeamsResult({ teams: [], isLoading: true }))

    render(<TeamSwitcher onChangeTeam={vi.fn()} />)

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
  })
})
