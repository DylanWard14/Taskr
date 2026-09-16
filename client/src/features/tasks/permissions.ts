import type { TeamRole } from '../teams/types'

// Client-side mirror of the permission matrix enforced by
// server/src/modules/tasks/service.ts. This only controls which controls are
// *rendered* — the server remains the actual enforcement point, and a delete
// attempt that shouldn't have been possible (e.g. stale permission state)
// can still fail with a 403 that the UI surfaces rather than silently
// trusting.

export function canDeleteTask(viewerRole: TeamRole): boolean {
  return viewerRole === 'owner' || viewerRole === 'admin'
}
