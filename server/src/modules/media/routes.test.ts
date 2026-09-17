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

import jwt from "jsonwebtoken";
import * as fsPromises from "node:fs/promises";
import * as repository from "./repository.js";
import type { MediaRecord, TeamRole } from "./repository.js";
import { app } from "../../index.js";

const mockedRepo = vi.mocked(repository);
const mockedFs = vi.mocked(fsPromises);

const TEAM_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const TASK_ID = "33333333-3333-3333-3333-333333333333";
const COMMENT_ID = "44444444-4444-4444-4444-444444444444";
const MEDIA_ID = "55555555-5555-5555-5555-555555555555";
const UPLOADER_ID = "66666666-6666-6666-6666-666666666666";

function tokenFor(id: string, email = "user@example.com") {
  return jwt.sign({ id, email }, "test-secret");
}

function authHeaders(id = USER_ID) {
  return { Authorization: `Bearer ${tokenFor(id)}` };
}

function membership(role: TeamRole, userId = USER_ID) {
  return { team_id: TEAM_ID, user_id: userId, role };
}

function mockTaskMember(role: TeamRole = "member") {
  mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
  mockedRepo.findMembership.mockResolvedValueOnce(membership(role));
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

// A real PNG magic-byte signature so upload tests pass the service's
// content-sniffing check (not just the declared Content-Type allowlist).
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

function pngFormData(fields: Record<string, string> = {}, bytes: Uint8Array = PNG_SIGNATURE): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append("file", new File([bytes], "photo.png", { type: "image/png" }));
  return form;
}

describe("media routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.MEDIA_UPLOAD_DIR = "/tmp/media-routes-test-uploads";
  });

  describe("POST /media/upload", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request("/media/upload", { method: "POST", body: pngFormData({ taskId: TASK_ID }) });
      expect(res.status).toBe(401);
    });

    it("returns 400 when neither taskId nor commentId is given", async () => {
      const res = await app.request("/media/upload", {
        method: "POST",
        headers: authHeaders(),
        body: pngFormData(),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when both taskId and commentId are given", async () => {
      const res = await app.request("/media/upload", {
        method: "POST",
        headers: authHeaders(),
        body: pngFormData({ taskId: TASK_ID, commentId: COMMENT_ID }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 when the task doesn't exist", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(undefined);

      const res = await app.request("/media/upload", {
        method: "POST",
        headers: authHeaders(),
        body: pngFormData({ taskId: TASK_ID }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 404 for a non-member", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request("/media/upload", {
        method: "POST",
        headers: authHeaders(),
        body: pngFormData({ taskId: TASK_ID }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 400 for a disallowed content type", async () => {
      mockTaskMember();

      const form = new FormData();
      form.append("taskId", TASK_ID);
      form.append("file", new File(["not an image"], "doc.pdf", { type: "application/pdf" }));

      const res = await app.request("/media/upload", { method: "POST", headers: authHeaders(), body: form });

      expect(res.status).toBe(400);
    });

    it("returns 400 when the file's bytes don't match its declared Content-Type (spoofed)", async () => {
      mockTaskMember();

      const res = await app.request("/media/upload", {
        method: "POST",
        headers: authHeaders(),
        body: pngFormData({ taskId: TASK_ID }, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
      });

      expect(res.status).toBe(400);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it("returns 201 and the created record on success", async () => {
      mockTaskMember();
      mockedRepo.insertMedia.mockResolvedValueOnce(mediaRecord({ uploaded_by: USER_ID }));

      const res = await app.request("/media/upload", {
        method: "POST",
        headers: authHeaders(),
        body: pngFormData({ taskId: TASK_ID }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as MediaRecord;
      expect(body.uploaded_by).toBe(USER_ID);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /media", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request(`/media?taskId=${TASK_ID}`);
      expect(res.status).toBe(401);
    });

    it("returns 400 without a taskId or commentId", async () => {
      const res = await app.request("/media", { headers: authHeaders() });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-member", async () => {
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/media?taskId=${TASK_ID}`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("returns 200 with the media list for a member", async () => {
      mockTaskMember();
      mockedRepo.listMediaForTask.mockResolvedValueOnce([mediaRecord()]);

      const res = await app.request(`/media?taskId=${TASK_ID}`, { headers: authHeaders() });

      expect(res.status).toBe(200);
      const body = (await res.json()) as MediaRecord[];
      expect(body).toHaveLength(1);
    });
  });

  describe("GET /media/:id/file", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request(`/media/${MEDIA_ID}/file`);
      expect(res.status).toBe(401);
    });

    it("returns 404 when the media doesn't exist", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(undefined);

      const res = await app.request(`/media/${MEDIA_ID}/file`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("returns 404 for a non-member", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord());
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(undefined);

      const res = await app.request(`/media/${MEDIA_ID}/file`, { headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("streams the file bytes with the correct content type for a member", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ content_type: "image/webp" }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member"));
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from("image-bytes"));

      const res = await app.request(`/media/${MEDIA_ID}/file`, { headers: authHeaders() });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await res.text()).toBe("image-bytes");
    });
  });

  describe("DELETE /media/:id", () => {
    it("returns 401 without a token", async () => {
      const res = await app.request(`/media/${MEDIA_ID}`, { method: "DELETE" });
      expect(res.status).toBe(401);
    });

    it("returns 404 when the media doesn't exist", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(undefined);

      const res = await app.request(`/media/${MEDIA_ID}`, { method: "DELETE", headers: authHeaders() });

      expect(res.status).toBe(404);
    });

    it("allows the uploader to delete their own upload (204)", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: USER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member"));
      mockedRepo.deleteMediaRow.mockResolvedValueOnce(1);
      mockedFs.unlink.mockResolvedValueOnce(undefined);

      const res = await app.request(`/media/${MEDIA_ID}`, { method: "DELETE", headers: authHeaders() });

      expect(res.status).toBe(204);
    });

    it("blocks a plain member from deleting someone else's upload (403)", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("member"));

      const res = await app.request(`/media/${MEDIA_ID}`, { method: "DELETE", headers: authHeaders() });

      expect(res.status).toBe(403);
    });

    it("allows an admin to delete someone else's upload (204)", async () => {
      mockedRepo.findMediaById.mockResolvedValueOnce(mediaRecord({ uploaded_by: UPLOADER_ID }));
      mockedRepo.findTaskTeamId.mockResolvedValueOnce(TEAM_ID);
      mockedRepo.findMembership.mockResolvedValueOnce(membership("admin"));
      mockedRepo.deleteMediaRow.mockResolvedValueOnce(1);
      mockedFs.unlink.mockResolvedValueOnce(undefined);

      const res = await app.request(`/media/${MEDIA_ID}`, { method: "DELETE", headers: authHeaders() });

      expect(res.status).toBe(204);
    });
  });
});
