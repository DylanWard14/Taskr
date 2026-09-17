import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  findTaskTeamId: vi.fn(),
  findCommentTaskId: vi.fn(),
  findMembership: vi.fn(),
  insertMedia: vi.fn(),
  findMediaById: vi.fn(),
  listMediaForTask: vi.fn(),
  listMediaForComment: vi.fn(),
  deleteMediaRow: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

import * as fsPromises from "node:fs/promises";
import * as repository from "./repository.js";
import type { MediaRecord, TeamRole } from "./repository.js";
import { deleteMedia, getMediaFile, listMedia, uploadMedia, type UploadFile } from "./service.js";

const mockedRepo = vi.mocked(repository);
const mockedFs = vi.mocked(fsPromises);

const TEAM_ID = "team-1";
const TASK_ID = "task-1";
const COMMENT_ID = "comment-1";
const MEDIA_ID = "media-1";
const UPLOADER_ID = "uploader-1";
const OWNER_ID = "owner-1";
const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";
const OUTSIDER_ID = "outsider-1";

function membership(role: TeamRole, userId = "whoever") {
  return { team_id: TEAM_ID, user_id: userId, role };
}

function mediaRecord(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: MEDIA_ID,
    url: `/media/${MEDIA_ID}/file`,
    content_type: "image/png",
    uploaded_by: UPLOADER_ID,
    task_id: TASK_ID,
    comment_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// Real magic-byte signatures for each allowed type, so "happy path" tests
// pass the service's own content-sniffing check by default.
const VALID_SIGNATURE_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0],
  "image/jpeg": [0xff, 0xd8, 0xff, 0, 0],
  "image/gif": [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

function fakeFile(overrides: Partial<{ type: string; size: number; bytes: Uint8Array }> = {}): UploadFile {
  const type = overrides.type ?? "image/png";
  const bytes = overrides.bytes ?? new Uint8Array(VALID_SIGNATURE_BYTES[type] ?? [1, 2, 3]);
  return {
    type,
    size: overrides.size ?? bytes.byteLength,
    arrayBuffer: async () => bytes.buffer as ArrayBuffer,
  };
}

describe("media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MEDIA_UPLOAD_DIR = "/tmp/media-service-test-uploads";
  });

  describe("uploadMedia — task target", () => {
    it("400s when neither taskId nor commentId is given", async () => {
      await expect(uploadMedia(MEMBER_ID, { file: fakeFile() })).rejects.toMatchObject({ status: 400 });
      expect(mockedRepo.findTaskTeamId).not.toHaveBeenCalled();
    });

    it("400s when both taskId and commentId are given", async () => {
      await expect(
        uploadMedia(MEMBER_ID, { taskId: TASK_ID, commentId: COMMENT_ID, file: fakeFile() }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("404s when the task doesn't exist", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(undefined);

      await expect(uploadMedia(OUTSIDER_ID, { taskId: TASK_ID, file: fakeFile() })).rejects.toMatchObject({
        status: 404,
      });
      expect(mockedRepo.insertMedia).not.toHaveBeenCalled();
    });

    it("404s for a non-member", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      await expect(uploadMedia(OUTSIDER_ID, { taskId: TASK_ID, file: fakeFile() })).rejects.toMatchObject({
        status: 404,
      });
      expect(mockedRepo.insertMedia).not.toHaveBeenCalled();
    });

    it("400s for a disallowed content type", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));

      await expect(
        uploadMedia(MEMBER_ID, { taskId: TASK_ID, file: fakeFile({ type: "application/pdf" }) }),
      ).rejects.toMatchObject({ status: 400 });
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it("413s for an oversized file", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));

      await expect(
        uploadMedia(MEMBER_ID, { taskId: TASK_ID, file: fakeFile({ size: 5 * 1024 * 1024 + 1 }) }),
      ).rejects.toMatchObject({ status: 413 });
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it("400s when the file's bytes don't match its declared content-type (spoofed Content-Type)", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));

      await expect(
        uploadMedia(MEMBER_ID, {
          taskId: TASK_ID,
          file: fakeFile({ type: "image/png", bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) }),
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
      expect(mockedRepo.insertMedia).not.toHaveBeenCalled();
    });

    it.each(["image/png", "image/jpeg", "image/gif", "image/webp"])(
      "accepts a real %s file whose bytes match its magic-byte signature",
      async (type) => {
        mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
        mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
        mockedRepo.insertMedia.mockImplementationOnce((input) =>
          Promise.resolve(
            mediaRecord({
              id: input.id,
              url: input.url,
              content_type: input.contentType,
              uploaded_by: input.uploadedBy,
              task_id: input.taskId ?? null,
              comment_id: input.commentId ?? null,
            }),
          ),
        );

        const result = await uploadMedia(MEMBER_ID, { taskId: TASK_ID, file: fakeFile({ type }) });

        expect(result.content_type).toBe(type);
        expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
      },
    );

    it("uploads successfully, writes the file to disk, and returns a servable url", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mockedRepo.insertMedia.mockImplementationOnce((input) =>
        Promise.resolve(
          mediaRecord({
            id: input.id,
            url: input.url,
            content_type: input.contentType,
            uploaded_by: input.uploadedBy,
            task_id: input.taskId ?? null,
            comment_id: input.commentId ?? null,
          }),
        ),
      );

      const result = await uploadMedia(MEMBER_ID, { taskId: TASK_ID, file: fakeFile() });

      expect(mockedFs.mkdir).toHaveBeenCalledWith("/tmp/media-service-test-uploads", { recursive: true });
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
      expect(result.url).toBe(`/media/${result.id}/file`);
      expect(result.task_id).toBe(TASK_ID);
      expect(result.comment_id).toBeNull();
    });
  });

  describe("uploadMedia — comment target", () => {
    it("404s when the comment doesn't exist", async () => {
      mockedRepo.findCommentTaskId.mockResolvedValueOnce(undefined);

      await expect(uploadMedia(OUTSIDER_ID, { commentId: COMMENT_ID, file: fakeFile() })).rejects.toMatchObject({
        status: 404,
      });
      expect(mockedRepo.findTaskTeamId).not.toHaveBeenCalled();
    });

    it("404s for a non-member", async () => {
      mockedRepo.findCommentTaskId.mockResolvedValueOnce(TASK_ID);
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      await expect(uploadMedia(OUTSIDER_ID, { commentId: COMMENT_ID, file: fakeFile() })).rejects.toMatchObject({
        status: 404,
      });
      expect(mockedRepo.insertMedia).not.toHaveBeenCalled();
    });

    it("resolves the team via the comment's task (two hops) and succeeds", async () => {
      mockedRepo.findCommentTaskId.mockResolvedValueOnce(TASK_ID);
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mockedRepo.insertMedia.mockImplementationOnce((input) =>
        Promise.resolve(
          mediaRecord({
            id: input.id,
            url: input.url,
            content_type: input.contentType,
            uploaded_by: input.uploadedBy,
            task_id: null,
            comment_id: input.commentId ?? null,
          }),
        ),
      );

      const result = await uploadMedia(MEMBER_ID, { commentId: COMMENT_ID, file: fakeFile() });

      expect(result.comment_id).toBe(COMMENT_ID);
      expect(result.task_id).toBeNull();
    });
  });

  describe("listMedia", () => {
    it("404s for a non-member (task target)", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      await expect(listMedia(OUTSIDER_ID, { taskId: TASK_ID })).rejects.toMatchObject({ status: 404 });
      expect(mockedRepo.listMediaForTask).not.toHaveBeenCalled();
    });

    it("404s for a non-member (comment target)", async () => {
      mockedRepo.findCommentTaskId.mockResolvedValueOnce(TASK_ID);
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      await expect(listMedia(OUTSIDER_ID, { commentId: COMMENT_ID })).rejects.toMatchObject({ status: 404 });
      expect(mockedRepo.listMediaForComment).not.toHaveBeenCalled();
    });

    it("lists media for a task member", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mockedRepo.listMediaForTask.mockResolvedValueOnce([mediaRecord()]);

      const result = await listMedia(MEMBER_ID, { taskId: TASK_ID });

      expect(result).toHaveLength(1);
    });

    it("lists media for a comment member", async () => {
      mockedRepo.findCommentTaskId.mockResolvedValueOnce(TASK_ID);
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mockedRepo.listMediaForComment.mockResolvedValueOnce([mediaRecord({ task_id: null, comment_id: COMMENT_ID })]);

      const result = await listMedia(MEMBER_ID, { commentId: COMMENT_ID });

      expect(result).toHaveLength(1);
    });
  });

  describe("getMediaFile", () => {
    it("404s when the media row doesn't exist", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(undefined);

      await expect(getMediaFile(MEDIA_ID, MEMBER_ID)).rejects.toMatchObject({ status: 404 });
    });

    it("404s for a non-member, resolved via the media row's own task_id", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ task_id: TASK_ID, comment_id: null }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      await expect(getMediaFile(MEDIA_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mockedFs.readFile).not.toHaveBeenCalled();
    });

    it("reads and returns the file bytes for a member", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord());
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from("data"));

      const result = await getMediaFile(MEDIA_ID, MEMBER_ID);

      expect(result.contentType).toBe("image/png");
      expect(result.buffer.toString()).toBe("data");
    });

    it("resolves access via a comment-targeted media row (two hops)", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ task_id: null, comment_id: COMMENT_ID }));
      mockedRepo.findCommentTaskId.mockResolvedValueOnce(TASK_ID);
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from("data"));

      const result = await getMediaFile(MEDIA_ID, MEMBER_ID);

      expect(result.buffer.toString()).toBe("data");
    });
  });

  describe("deleteMedia", () => {
    it("404s when the media row doesn't exist", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(undefined);

      await expect(deleteMedia(MEDIA_ID, MEMBER_ID)).rejects.toMatchObject({ status: 404 });
    });

    it("404s for a non-member", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord());
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      await expect(deleteMedia(MEDIA_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mockedRepo.deleteMediaRow).not.toHaveBeenCalled();
    });

    it("allows the uploader (a plain member) to delete their own upload", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", UPLOADER_ID));
      mockedRepo.deleteMediaRow.mockResolvedValueOnce(1);
      mockedFs.unlink.mockResolvedValueOnce(undefined);

      await deleteMedia(MEDIA_ID, UPLOADER_ID);

      expect(mockedRepo.deleteMediaRow).toHaveBeenCalledWith(MEDIA_ID);
      expect(mockedFs.unlink).toHaveBeenCalledTimes(1);
    });

    it("allows an owner to delete someone else's upload", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("owner", OWNER_ID));
      mockedRepo.deleteMediaRow.mockResolvedValueOnce(1);
      mockedFs.unlink.mockResolvedValueOnce(undefined);

      await deleteMedia(MEDIA_ID, OWNER_ID);

      expect(mockedRepo.deleteMediaRow).toHaveBeenCalledWith(MEDIA_ID);
    });

    it("allows an admin to delete someone else's upload", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("admin", ADMIN_ID));
      mockedRepo.deleteMediaRow.mockResolvedValueOnce(1);
      mockedFs.unlink.mockResolvedValueOnce(undefined);

      await deleteMedia(MEDIA_ID, ADMIN_ID);

      expect(mockedRepo.deleteMediaRow).toHaveBeenCalledWith(MEDIA_ID);
    });

    it("blocks a plain member from deleting someone else's upload (403)", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", MEMBER_ID));

      await expect(deleteMedia(MEDIA_ID, MEMBER_ID)).rejects.toMatchObject({ status: 403 });
      expect(mockedRepo.deleteMediaRow).not.toHaveBeenCalled();
    });

    it("doesn't throw when the file is already missing on disk", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member", UPLOADER_ID));
      mockedRepo.deleteMediaRow.mockResolvedValueOnce(1);
      const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
      mockedFs.unlink.mockRejectedValueOnce(enoent);

      await expect(deleteMedia(MEDIA_ID, UPLOADER_ID)).resolves.toBeUndefined();
    });
  });
});
