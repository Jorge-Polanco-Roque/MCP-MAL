import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import type { ISecrets } from "../secrets.js";

export class SecretManagerAdapter implements ISecrets {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private cache: Map<string, { value: string; expiry: number }>;

  constructor(projectId: string) {
    this.client = new SecretManagerServiceClient();
    this.projectId = projectId;
    this.cache = new Map();
  }

  async get(key: string): Promise<string> {
    // Check cache (5 min TTL)
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const secretName = `projects/${this.projectId}/secrets/${key}/versions/latest`;

    const [version] = await this.client.accessSecretVersion({
      name: secretName,
    });

    const payload = version.payload?.data;
    if (!payload) {
      throw new Error(`Secret '${key}' has no payload`);
    }

    const value = typeof payload === "string" ? payload : Buffer.from(payload).toString("utf-8");

    // Cache for 5 minutes
    this.cache.set(key, {
      value,
      expiry: Date.now() + 5 * 60 * 1000,
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
