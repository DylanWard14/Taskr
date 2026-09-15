import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamList } from './TeamList'
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

describe('TeamList', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mockUseTeams.mockReset()
  })

  it('shows a loading indicator while teams are loading', () => {
    mockUseTeams.mockReturnValue(mockTeamsResult({ isLoading: true }))

    render(<TeamList />)

    expect(screen.getByLabelText(/loading teams/i)).toBeInTheDocument()
  })

  it('shows an error message when loading fails', () => {
    mockUseTeams.mockReturnValue(mockTeamsResult({ error: 'Failed to load teams' }))

    render(<TeamList />)

    expect(screen.getByText('Failed to load teams')).toBeInTheDocument()
  })

  it('shows an empty state when the user has no teams', () => {
    mockUseTeams.mockReturnValue(mockTeamsResult({ teams: [] }))

    render(<TeamList />)

    expect(screen.getByText(/not a member of any teams/i)).toBeInTheDocument()
  })

  it('renders the list of teams and notifies on selection', () => {
    const onSelectTeam = vi.fn()
    mockUseTeams.mockReturnValue(
      mockTeamsResult({
        teams: [
          { id: 'team-1', name: 'Team One' },
          { id: 'team-2', name: 'Team Two' },
        ],
      }),
    )

    render(<TeamList onSelectTeam={onSelectTeam} />)

    expect(screen.getByText('Team One')).toBeInTheDocument()
    expect(screen.getByText('Team Two')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Team Two'))

    expect(onSelectTeam).toHaveBeenCalledWith('team-2')
  })
})
