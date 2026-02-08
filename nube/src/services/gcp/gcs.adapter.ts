import { Storage } from "@google-cloud/storage";
import type { IStorage } from "../storage.js";
import { logger } from "../../utils/logger.js";

const RETRYABLE_CODES = [429, 500, 503];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "application/x-yaml",
  ".yml": "application/x-yaml",
};

function getContentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "text/plain; charset=utf-8";
}

async function withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const code = (error as { code?: number }).code;
      const isRetryable = typeof code === "number" && RETRYABLE_CODES.includes(code);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      logger.warn({ attempt: attempt + 1, delay, label }, "GCS retry");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // unreachable but satisfies TypeScript
  throw new Error("Retry exhausted");
}

export class GCSAdapter implements IStorage {
  private storage: Storage;
  private bucketName: string;
  private maxFileSize: number;

  constructor(bucketName: string) {
    this.storage = new Storage();
    this.bucketName = bucketName;
    this.maxFileSize = parseInt(process.env.GCS_MAX_FILE_SIZE || "10485760"); // 10MB
  }

  private get bucket() {
    return this.storage.bucket(this.bucketName);
  }

  async read(path: string): Promise<string> {
    return withRetry(async () => {
      // Check file size before downloading
      const [metadata] = await this.bucket.file(path).getMetadata();
      const size = typeof metadata.size === "string" ? parseInt(metadata.size) : (metadata.size ?? 0);
      if (size > this.maxFileSize) {
        throw new Error(`File ${path} exceeds max size (${size} > ${this.maxFileSize} bytes)`);
      }

      const [content] = await this.bucket.file(path).download();
      return content.toString("utf-8");
    }, `read:${path}`);
  }

  async write(path: string, content: string, contentType?: string): Promise<void> {
    return withRetry(async () => {
      await this.bucket.file(path).save(content, {
        contentType: contentType ?? getContentType(path),
      });
    }, `write:${path}`);
  }

  async delete(path: string): Promise<void> {
    return withRetry(async () => {
      await this.bucket.file(path).delete();
    }, `delete:${path}`);
  }

  async list(prefix: string): Promise<string[]> {
    return withRetry(async () => {
      const [files] = await this.bucket.getFiles({ prefix });
      return files.map((f) => f.name);
    }, `list:${prefix}`);
  }

  async exists(path: string): Promise<boolean> {
    return withRetry(async () => {
      const [exists] = await this.bucket.file(path).exists();
      return exists;
    }, `exists:${path}`);
  }

  async getUrl(path: string): Promise<string> {
    const [url] = await this.bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    return url;
  }
}
