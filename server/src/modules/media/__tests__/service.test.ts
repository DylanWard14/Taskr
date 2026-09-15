import { beforeEach, describe, expect, it, vi } from "vitest";

const { mkdirMock, writeFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn().mockResolvedValue(undefined),
  writeFileMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

vi.mock("../repository.js", () => ({
  createMedia: vi.fn(),
}));

const repository = await import("../repository.js");
const { uploadMedia, UPLOADS_DIR } = await import("../service.js");

beforeEach(() => {
  mkdirMock.mockClear();
  writeFileMock.mockClear();
  vi.mocked(repository.createMedia).mockReset();
});

function fakeFile(name: string, type: string, contents = "file-bytes") {
  const bytes = new TextEncoder().encode(contents);
  return {
    name,
    type,
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  };
}

describe("uploadMedia", () => {
  it("ensures the uploads directory exists and writes the file to disk", async () => {
    vi.mocked(repository.createMedia).mockResolvedValue({
      id: "media-1",
      url: "/uploads/whatever",
      content_type: "image/png",
      uploaded_by: "user-1",
      task_id: null,
      comment_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const file = fakeFile("photo.png", "image/png");

    await uploadMedia({ file, uploadedBy: "user-1" });

    expect(mkdirMock).toHaveBeenCalledWith(UPLOADS_DIR, { recursive: true });
    expect(writeFileMock).toHaveBeenCalledTimes(1);

    const [destination, buffer] = writeFileMock.mock.calls[0];
    expect(destination).toContain(UPLOADS_DIR);
    expect(destination.endsWith(".png")).toBe(true);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it("persists a media record with the generated url, content type, and uploader", async () => {
    vi.mocked(repository.createMedia).mockResolvedValue({} as any);

    const file = fakeFile("doc.pdf", "application/pdf");
    await uploadMedia({ file, uploadedBy: "user-1", taskId: "task-1" });

    expect(repository.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "application/pdf",
        uploadedBy: "user-1",
        taskId: "task-1",
        commentId: undefined,
      })
    );
    const call = vi.mocked(repository.createMedia).mock.calls[0][0];
    expect(call.url).toMatch(/^\/uploads\/.+\.pdf$/);
  });

  it("falls back to a generic content type when the file doesn't provide one", async () => {
    vi.mocked(repository.createMedia).mockResolvedValue({} as any);

    const file = fakeFile("blob", "");
    await uploadMedia({ file, uploadedBy: "user-1" });

    expect(repository.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "application/octet-stream" })
    );
  });

  it("returns the created media record", async () => {
    const record = {
      id: "media-1",
      url: "/uploads/abc.png",
      content_type: "image/png",
      uploaded_by: "user-1",
      task_id: null,
      comment_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    vi.mocked(repository.createMedia).mockResolvedValue(record);

    const result = await uploadMedia({ file: fakeFile("a.png", "image/png"), uploadedBy: "user-1" });

    expect(result).toEqual(record);
  });
});
