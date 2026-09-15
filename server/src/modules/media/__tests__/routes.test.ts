import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = "test-secret";

vi.mock("../service.js", () => ({
  uploadMedia: vi.fn(),
}));

const service = await import("../service.js");
const { mediaRoutes } = await import("../routes.js");

function tokenFor(userId: string) {
  return jwt.sign({ id: userId, email: `${userId}@example.com` }, "test-secret");
}

const app = new Hono();
app.route("/media", mediaRoutes);

beforeEach(() => {
  vi.mocked(service.uploadMedia).mockReset();
});

describe("POST /media/upload", () => {
  it("returns 401 without a token", async () => {
    const res = await app.request("/media/upload", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const form = new FormData();
    form.set("taskId", "11111111-1111-1111-1111-111111111111");

    const res = await app.request("/media/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
      body: form,
    });

    expect(res.status).toBe(400);
    expect(service.uploadMedia).not.toHaveBeenCalled();
  });

  it("returns 400 when taskId isn't a valid uuid", async () => {
    const form = new FormData();
    form.set("file", new File(["hello"], "hello.txt", { type: "text/plain" }));
    form.set("taskId", "not-a-uuid");

    const res = await app.request("/media/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
      body: form,
    });

    expect(res.status).toBe(400);
    expect(service.uploadMedia).not.toHaveBeenCalled();
  });

  it("uploads the file and returns the created media record", async () => {
    const taskId = "11111111-1111-1111-1111-111111111111";
    const record = {
      id: "media-1",
      url: "/uploads/hello.txt",
      content_type: "text/plain",
      uploaded_by: "user-1",
      task_id: taskId,
      comment_id: null,
    };
    vi.mocked(service.uploadMedia).mockResolvedValue(record as any);

    const form = new FormData();
    form.set("file", new File(["hello"], "hello.txt", { type: "text/plain" }));
    form.set("taskId", taskId);

    const res = await app.request("/media/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenFor("user-1")}` },
      body: form,
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(record);

    const call = vi.mocked(service.uploadMedia).mock.calls[0][0];
    expect(call.uploadedBy).toBe("user-1");
    expect(call.taskId).toBe(taskId);
    expect(call.file.name).toBe("hello.txt");
  });
});
