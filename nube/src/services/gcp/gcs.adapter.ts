import { Storage } from "@google-cloud/storage";
import type { IStorage } from "../storage.js";

export class GCSAdapter implements IStorage {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string) {
    this.storage = new Storage();
    this.bucketName = bucketName;
  }

  private get bucket() {
    return this.storage.bucket(this.bucketName);
  }

  async read(path: string): Promise<string> {
    const [content] = await this.bucket.file(path).download();
    return content.toString("utf-8");
  }

  async write(path: string, content: string): Promise<void> {
    await this.bucket.file(path).save(content, {
      contentType: "text/plain; charset=utf-8",
    });
  }

  async delete(path: string): Promise<void> {
    await this.bucket.file(path).delete();
  }

  async list(prefix: string): Promise<string[]> {
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map((f) => f.name);
  }

  async exists(path: string): Promise<boolean> {
    const [exists] = await this.bucket.file(path).exists();
    return exists;
  }

  async getUrl(path: string): Promise<string> {
    const [url] = await this.bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    return url;
  }
}
