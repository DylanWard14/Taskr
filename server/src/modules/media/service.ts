import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMedia, type MediaRecord } from "./repository.js";

export interface UploadableFile {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// server/src/modules/media -> server/uploads
export const UPLOADS_DIR = path.resolve(moduleDir, "../../../uploads");

function extensionFor(fileName: string): string {
  return path.extname(fileName);
}

export interface UploadMediaParams {
  file: UploadableFile;
  uploadedBy: string;
  taskId?: string;
  commentId?: string;
}

export async function uploadMedia(params: UploadMediaParams): Promise<MediaRecord> {
  const { file, uploadedBy, taskId, commentId } = params;

  await mkdir(UPLOADS_DIR, { recursive: true });

  const filename = `${randomUUID()}${extensionFor(file.name)}`;
  const destination = path.join(UPLOADS_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, buffer);

  return createMedia({
    url: `/uploads/${filename}`,
    contentType: file.type || "application/octet-stream",
    uploadedBy,
    taskId,
    commentId,
  });
}
