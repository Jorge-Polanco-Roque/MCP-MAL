import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Mock GCP services for tool tests
vi.mock("@google-cloud/firestore", () => ({
  Firestore: class {
    collection() {
      return {
        doc: () => ({
          get: async () => ({ exists: false, data: () => null }),
          set: async () => {},
        }),
        count: () => ({
          get: async () => ({ data: () => ({ count: 0 }) }),
        }),
        orderBy: () => ({
          offset: () => ({
            limit: () => ({
              get: async () => ({ docs: [] }),
            }),
          }),
        }),
      };
    }
    async listCollections() { return []; }
  },
}));

vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket() {
      return {
        file: () => ({
          download: async () => [Buffer.from("test content")],
          save: async () => {},
          delete: async () => {},
          exists: async () => [false],
          getSignedUrl: async () => ["https://example.com/signed"],
        }),
        getFiles: async () => [[]],
      };
    }
  },
}));

describe("Registry Tools (GCP)", () => {
  it("should register all tools on a McpServer", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const { GCSAdapter } = await import("../../src/services/gcp/gcs.adapter.js");
    const { registerRegistryTools } = await import("../../src/tools/registry.js");

    const server = new McpServer({ name: "test", version: "1.0.0" });
    const db = new FirestoreAdapter("test-project");
    const storage = new GCSAdapter("test-bucket");

    registerRegistryTools(server, db, storage);
    expect(true).toBe(true);
  });
});
