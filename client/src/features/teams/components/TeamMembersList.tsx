import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getErrorMessage } from '../../../lib/errors'
import { useRemoveTeamMember } from '../hooks/useRemoveTeamMember'
import { useUpdateMemberRole } from '../hooks/useUpdateMemberRole'
import { canChangeRole, canRemoveMember } from '../permissions'
import type { TeamMember, TeamRole, UpdatableTeamRole } from '../types'

export interface TeamMembersListProps {
  teamId: string
  members: TeamMember[]
  viewerUserId: string
  viewerRole: TeamRole
  onLeave?: () => void
}

export function TeamMembersList({
  teamId,
  members,
  viewerUserId,
  viewerRole,
  onLeave,
}: TeamMembersListProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const updateMemberRole = useUpdateMemberRole(teamId)
  const removeTeamMember = useRemoveTeamMember(teamId)

  const handleRoleChange = (userId: string, role: UpdatableTeamRole) => {
    setActionError(null)
    updateMemberRole.mutate(
      { userId, role },
      { onError: (error) => setActionError(getErrorMessage(error)) },
    )
  }

  const handleRemove = (member: TeamMember) => {
    setActionError(null)
    const isSelf = member.user_id === viewerUserId
    removeTeamMember.mutate(member.user_id, {
      onSuccess: () => {
        if (isSelf) {
          onLeave?.()
        }
      },
      onError: (error) => setActionError(getErrorMessage(error)),
    })
  }

  return (
    <Stack spacing={1}>
      {actionError && <Alert severity="error">{actionError}</Alert>}
      <List disablePadding>
        {members.map((member) => {
          const isSelf = member.user_id === viewerUserId
          const showRoleControls = canChangeRole(viewerRole, viewerUserId, member)
          const showRemove = canRemoveMember(viewerRole, viewerUserId, member)

          return (
            <ListItem
              key={member.user_id}
              divider
              secondaryAction={
                <Stack direction="row" spacing={1} alignItems="center">
                  {showRoleControls && member.role !== 'admin' && (
                    <Button size="small" onClick={() => handleRoleChange(member.user_id, 'admin')}>
                      Make admin
                    </Button>
                  )}
                  {showRoleControls && member.role !== 'member' && (
                    <Button size="small" onClick={() => handleRoleChange(member.user_id, 'member')}>
                      Make member
                    </Button>
                  )}
                  {showRemove && (
                    <Button
                      size="small"
                      color={isSelf ? 'inherit' : 'error'}
                      onClick={() => handleRemove(member)}
                      disabled={removeTeamMember.isPending}
                    >
                      {isSelf ? 'Leave team' : 'Remove'}
                    </Button>
                  )}
                </Stack>
              }
            >
              <ListItemText
                primary={`${member.name}${isSelf ? ' (you)' : ''}`}
                secondary={
                  <Typography variant="body2" color="text.secondary" component="span">
                    {member.email} · {member.role}
                  </Typography>
                }
              />
            </ListItem>
          )
        })}
      </List>
    </Stack>
  )
}
