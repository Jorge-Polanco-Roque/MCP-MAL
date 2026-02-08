import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import type { ISecrets } from "../secrets.js";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SECRET_TIMEOUT_MS = 10_000; // 10 seconds

export class SecretManagerAdapter implements ISecrets {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private cache: Map<string, { value: string; expiry: number }>;
  private cacheTtlMs: number;

  constructor(projectId: string) {
    this.client = new SecretManagerServiceClient();
    this.projectId = projectId;
    this.cache = new Map();
    this.cacheTtlMs = parseInt(process.env.SECRET_CACHE_TTL_MS || String(DEFAULT_CACHE_TTL_MS));
  }

  async get(key: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const secretName = `projects/${this.projectId}/secrets/${key}/versions/latest`;

    // Timeout wrapper
    const result = await Promise.race([
      this.client.accessSecretVersion({ name: secretName }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Secret '${key}' access timed out (${SECRET_TIMEOUT_MS}ms)`)), SECRET_TIMEOUT_MS)
      ),
    ]);

    const [version] = result;
    const payload = version.payload?.data;
    if (!payload) {
      throw new Error(`Secret '${key}' has no payload`);
    }

    const value = typeof payload === "string" ? payload : Buffer.from(payload).toString("utf-8");

    // Cache with configurable TTL
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.cacheTtlMs,
    });

    return value;
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.get(key);
      return true;
    } catch {
      return false;
    }
  }
}
