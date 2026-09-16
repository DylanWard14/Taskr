import type { TeamMember, TeamRole } from './types'

// Client-side mirror of the permission matrix enforced by
// server/src/modules/teams/service.ts. This only controls which controls are
// *rendered* — the server remains the actual enforcement point, and every
// mutation here can still fail with a meaningful error (e.g. the "last
// owner" checks) that the UI surfaces rather than silently trusting.

export function canManageMembers(viewerRole: TeamRole): boolean {
  return viewerRole === 'owner' || viewerRole === 'admin'
}

// Roles a viewer is allowed to pick when inviting a new member — only an
// owner may grant the owner role.
export function assignableRoles(viewerRole: TeamRole): TeamRole[] {
  return viewerRole === 'owner' ? ['member', 'admin', 'owner'] : ['member', 'admin']
}

// Only an owner may change another member's role, and never their own.
export function canChangeRole(viewerRole: TeamRole, viewerUserId: string, target: TeamMember): boolean {
  return viewerRole === 'owner' && target.user_id !== viewerUserId
}

// Whether the viewer can remove `target` from the team. Self-removal
// ("leave team") is always shown as available — the server still blocks a
// lone remaining owner from leaving, and that failure is surfaced as an
// error rather than assumed client-side.
export function canRemoveMember(viewerRole: TeamRole, viewerUserId: string, target: TeamMember): boolean {
  const isSelf = target.user_id === viewerUserId
  if (isSelf) {
    return true
  }

  if (target.role === 'owner' || target.role === 'admin') {
    return viewerRole === 'owner'
  }

  // target.role === 'member'
  return viewerRole === 'owner' || viewerRole === 'admin'
}
