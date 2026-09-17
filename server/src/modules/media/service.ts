import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HTTPException } from "hono/http-exception";
import * as repository from "./repository.js";
import type { MediaRecord, TeamMembershipRecord } from "./repository.js";

// Only images are accepted, and capped at 5MB — enforced here (post-parse)
// as the source of truth; routes.ts also applies hono/body-limit as a
// cheaper first line of defense against oversized request bodies.
export const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// The client-declared multipart Content-Type is trivially spoofable (a
// client can label any file "image/png"), and GET /:id/file replays the
// stored content_type back to other team members — so on top of the
// allowlist above, verify the file's actual bytes start with the expected
// magic-byte signature for its declared type before trusting it.
type SignatureValidator = (buffer: Buffer) => boolean;

const MAGIC_BYTE_VALIDATORS: Record<string, SignatureValidator> = {
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  "image/jpeg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/gif": (buffer) =>
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61,
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50,
};

function hasValidSignature(contentType: string, buffer: Buffer): boolean {
  const validator = MAGIC_BYTE_VALIDATORS[contentType];
  return validator ? validator(buffer) : false;
}

export interface MediaTarget {
  taskId?: string;
  commentId?: string;
}

// A minimal structural type for the multipart "file" field so this module
// doesn't need DOM lib types — Hono's parseBody() returns a real (global,
// undici-backed) File at runtime, and tests can pass any object shaped like
// this without needing jsdom.
export interface UploadFile {
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface UploadMediaInput extends MediaTarget {
  file: UploadFile;
}

function getUploadDir(): string {
  return process.env.MEDIA_UPLOAD_DIR ?? "./uploads";
}

// Disk filename is always the media row's own generated id — never the
// client-supplied original filename — so there's no path-traversal surface
// and no ambiguity between the DB row and the file on disk.
function filePathForId(id: string): string {
  return path.join(getUploadDir(), id);
}

function assertExactlyOneTarget(target: MediaTarget): void {
  if (Boolean(target.taskId) === Boolean(target.commentId)) {
    throw new HTTPException(400, { message: "Exactly one of taskId or commentId is required" });
  }
}

// Resolves the team a media target (a task, or a comment via its task)
// belongs to. 404s when the referenced task/comment doesn't exist at all —
// mirrors comments' requireTaskAccess, and deliberately doesn't distinguish
// "doesn't exist" from "not a member" to the caller (see requireAccess).
async function resolveTeamForTarget(target: MediaTarget): Promise<{ teamId: string }> {
  let taskId = target.taskId;

  if (!taskId && target.commentId) {
    taskId = await repository.findCommentTaskId(target.commentId);
    if (!taskId) {
      throw new HTTPException(404, { message: "Comment not found" });
    }
  }

  if (!taskId) {
    throw new HTTPException(400, { message: "Exactly one of taskId or commentId is required" });
  }

  const teamId = await repository.findTaskTeamId(taskId);
  if (!teamId) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  return { teamId };
}

// The sole enforcement point for "must be a member of the target's team" —
// used by every media operation (upload, list, fetch bytes, delete). Returns
// 404 (not 403) for non-members so a non-member can't distinguish "doesn't
// exist" from "exists but you're not in the team".
export async function requireAccess(
  target: MediaTarget,
  userId: string,
): Promise<{ teamId: string; role: TeamMembershipRecord["role"] }> {
  const { teamId } = await resolveTeamForTarget(target);

  const membership = await repository.findMembership(teamId, userId);
  if (!membership) {
    throw new HTTPException(404, { message: target.commentId ? "Comment not found" : "Task not found" });
  }

  return { teamId, role: membership.role };
}

export async function uploadMedia(userId: string, input: UploadMediaInput): Promise<MediaRecord> {
  const target: MediaTarget = { taskId: input.taskId, commentId: input.commentId };
  assertExactlyOneTarget(target);
  await requireAccess(target, userId);

  if (!ALLOWED_CONTENT_TYPES.has(input.file.type)) {
    throw new HTTPException(400, { message: "Only image uploads are supported" });
  }

  if (input.file.size > MAX_FILE_SIZE_BYTES) {
    throw new HTTPException(413, { message: "File exceeds the maximum upload size of 5MB" });
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  if (!hasValidSignature(input.file.type, buffer)) {
    throw new HTTPException(400, { message: "File contents do not match the declared image type" });
  }

  const id = randomUUID();
  const dir = getUploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(filePathForId(id), buffer);

  return repository.insertMedia({
    id,
    url: `/media/${id}/file`,
    contentType: input.file.type,
    uploadedBy: userId,
    taskId: target.taskId,
    commentId: target.commentId,
  });
}

export async function listMedia(userId: string, target: MediaTarget): Promise<MediaRecord[]> {
  assertExactlyOneTarget(target);
  await requireAccess(target, userId);

  if (target.taskId) {
    return repository.listMediaForTask(target.taskId);
  }
  return repository.listMediaForComment(target.commentId as string);
}

export interface MediaFile {
  contentType: string;
  buffer: Buffer;
}

export async function getMediaFile(id: string, userId: string): Promise<MediaFile> {
  const media = await repository.findMediaById(id);
  if (!media) {
    throw new HTTPException(404, { message: "Media not found" });
  }

  // Resolved from the media row's own task_id/comment_id — never
  // client-supplied — so a requester can't spoof access by claiming a
  // different (accessible) target for someone else's media.
  await requireAccess({ taskId: media.task_id ?? undefined, commentId: media.comment_id ?? undefined }, userId);

  const buffer = await readFile(filePathForId(media.id));
  return { contentType: media.content_type, buffer };
}

export async function deleteMedia(id: string, userId: string): Promise<void> {
  const media = await repository.findMediaById(id);
  if (!media) {
    throw new HTTPException(404, { message: "Media not found" });
  }

  const { role } = await requireAccess(
    { taskId: media.task_id ?? undefined, commentId: media.comment_id ?? undefined },
    userId,
  );

  const isUploader = media.uploaded_by === userId;
  const isModerator = role === "owner" || role === "admin";
  if (!isUploader && !isModerator) {
    throw new HTTPException(403, { message: "Only the uploader or a team owner/admin can delete this media" });
  }

  await repository.deleteMediaRow(id);

  // Best-effort disk cleanup: the DB row is the source of truth, so if the
  // file's already missing on disk, don't fail the whole delete.
  try {
    await unlink(filePathForId(id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Failed to remove media file for ${id}:`, err);
    }
  }
}
