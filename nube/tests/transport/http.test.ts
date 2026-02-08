import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ISecrets } from "../../src/services/secrets.js";
import type { IDatabase } from "../../src/services/database.js";
import type { IStorage } from "../../src/services/storage.js";
import type { TransportHandle } from "../../src/transport/http.js";

// Mock GCP services so module-level imports don't fail
vi.mock("@google-cloud/firestore", () => ({
  Firestore: class {
    collection() {
      const countFn = () => ({ get: async () => ({ data: () => ({ count: 0 }) }) });
      return {
        doc: () => ({
          get: async () => ({ exists: false, data: () => null }),
          set: async () => {},
        }),
        count: countFn,
        orderBy: () => ({
          count: countFn,
          offset: () => ({
            limit: () => ({
              get: async () => ({ docs: [] }),
            }),
          }),
        }),
        where: () => ({
          count: countFn,
          orderBy: () => ({
            count: countFn,
            offset: () => ({
              limit: () => ({
                get: async () => ({ docs: [] }),
              }),
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
          download: async () => [Buffer.from("test")],
          save: async () => {},
          delete: async () => {},
          exists: async () => [false],
          getSignedUrl: async () => ["https://example.com/signed"],
          getMetadata: async () => [{ size: "100" }],
        }),
        getFiles: async () => [[]],
      };
    }
  },
}));

function createMockSecrets(): ISecrets {
  return {
    get: vi.fn().mockResolvedValue("test-api-key"),
    has: vi.fn().mockResolvedValue(true),
  };
}

function createMockDb(): IDatabase {
  return {
    get: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, has_more: false }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn().mockResolvedValue({ items: [], total: 0, has_more: false }),
    ping: vi.fn().mockResolvedValue(true),
  };
}

function createMockStorage(): IStorage {
  return {
    read: vi.fn().mockResolvedValue("content"),
    write: vi.fn(),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    getUrl: vi.fn().mockResolvedValue("https://example.com/signed"),
  };
}

describe("HTTP Transport", () => {
  let handle: TransportHandle | null = null;

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = null;
    }
  });

  it("should start and respond to /health", async () => {
    const { startHttpTransport } = await import("../../src/transport/http.js");
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");

    handle = await startHttpTransport(
      () => new McpServer({ name: "test", version: "1.0.0" }),
      {
        port: 0, // random port
        host: "127.0.0.1",
        secrets: createMockSecrets(),
        services: { db: createMockDb(), storage: createMockStorage() },
      }
    );

    // The server started without error
    expect(handle).toBeDefined();
    expect(handle.close).toBeDefined();
    expect(handle.closeAllSessions).toBeDefined();
  });

  it("should return TransportHandle with closeAllSessions", async () => {
    const { startHttpTransport } = await import("../../src/transport/http.js");
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");

    handle = await startHttpTransport(
      () => new McpServer({ name: "test", version: "1.0.0" }),
      {
        port: 0,
        host: "127.0.0.1",
        secrets: createMockSecrets(),
        services: { db: createMockDb(), storage: createMockStorage() },
      }
    );

    // closeAllSessions should resolve without error even with no sessions
    await expect(handle.closeAllSessions()).resolves.not.toThrow();
  });
});
