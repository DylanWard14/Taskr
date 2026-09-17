import type { TeamRole } from '../teams/types'
import type { Media } from './types'

// Client-side mirror of the permission matrix enforced by
// server/src/modules/media/service.ts (deleteMedia). This only controls
// which controls are *rendered* — the server remains the actual enforcement
// point, and a delete attempt that shouldn't have been possible can still
// fail with a 403 that the UI surfaces rather than silently trusting.
//
// Identical in shape to comments' canDeleteComment: the uploader can always
// delete their own attachment regardless of role, and team owners/admins can
// delete anyone's. There's no "only the task/comment's author" restriction
// on upload, only on delete.
export function canDeleteMedia(viewerRole: TeamRole, viewerUserId: string, media: Media): boolean {
  const isUploader = media.uploaded_by === viewerUserId
  const isModerator = viewerRole === 'owner' || viewerRole === 'admin'
  return isUploader || isModerator
}
