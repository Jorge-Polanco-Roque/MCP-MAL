import type { ISecrets } from "../secrets.js";

export class DotenvAdapter implements ISecrets {
  async get(key: string): Promise<string> {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Secret not found: ${key}. Add it to your .env file.`);
    }
    return value;
  }

  async has(key: string): Promise<boolean> {
    return key in process.env && process.env[key] !== undefined && process.env[key] !== "";
  }
}
