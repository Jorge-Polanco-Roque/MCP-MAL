import { readFile, writeFile, unlink, readdir, access, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { IStorage } from "../storage.js";

export class FilesystemAdapter implements IStorage {
  constructor(private basePath: string) {}

  async read(path: string): Promise<string> {
    return readFile(join(this.basePath, path), "utf-8");
  }

  async write(path: string, content: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  async delete(path: string): Promise<void> {
    await unlink(join(this.basePath, path));
  }

  async list(prefix: string): Promise<string[]> {
    const dir = join(this.basePath, prefix);
    try {
      const entries = await readdir(dir, { recursive: true });
      return entries.map((e) => join(prefix, e.toString()));
    } catch {
      return [];
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(join(this.basePath, path));
      return true;
    } catch {
      return false;
    }
  }

  async getUrl(path: string): Promise<string> {
    return `file://${join(this.basePath, path)}`;
  }
}
