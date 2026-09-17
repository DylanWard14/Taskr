import type { TeamRole } from '../teams/types'
import type { Comment } from './types'

// Client-side mirror of the permission matrix enforced by
// server/src/modules/comments/service.ts (deleteComment). This only controls
// which controls are *rendered* — the server remains the actual enforcement
// point, and a delete attempt that shouldn't have been possible can still
// fail with a 403 that the UI surfaces rather than silently trusting.
//
// Unlike canDeleteTask (role alone), this also depends on whether the viewer
// is the comment's own author: a comment's author can always delete their
// own comment regardless of role, and team owners/admins can delete anyone's.
export function canDeleteComment(viewerRole: TeamRole, viewerUserId: string, comment: Comment): boolean {
  const isAuthor = comment.author_id === viewerUserId
  const isModerator = viewerRole === 'owner' || viewerRole === 'admin'
  return isAuthor || isModerator
}
