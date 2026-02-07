import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firestore for unit tests (no GCP credentials needed)
vi.mock("@google-cloud/firestore", () => {
  const store = new Map<string, Map<string, Record<string, unknown>>>();

  const mockDoc = (collection: string, id: string) => ({
    get: async () => {
      const col = store.get(collection);
      const data = col?.get(id);
      return {
        exists: !!data,
        id,
        data: () => data,
      };
    },
    set: async (data: Record<string, unknown>) => {
      if (!store.has(collection)) store.set(collection, new Map());
      store.get(collection)!.set(id, data);
    },
    update: async (data: Record<string, unknown>) => {
      const col = store.get(collection);
      const existing = col?.get(id) ?? {};
      col?.set(id, { ...existing, ...data });
    },
    delete: async () => {
      store.get(collection)?.delete(id);
    },
  });

  const mockCollection = (name: string) => ({
    doc: (id: string) => mockDoc(name, id),
    count: () => ({
      get: async () => ({
        data: () => ({ count: store.get(name)?.size ?? 0 }),
      }),
    }),
    orderBy: () => ({
      offset: () => ({
        limit: () => ({
          get: async () => ({
            docs: Array.from(store.get(name)?.entries() ?? []).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          }),
        }),
      }),
    }),
    where: () => ({
      offset: () => ({
        limit: () => ({
          get: async () => ({
            docs: [],
          }),
        }),
      }),
    }),
  });

  return {
    Firestore: class {
      collection(name: string) {
        return mockCollection(name);
      }
      async listCollections() {
        return [];
      }
    },
  };
});

describe("FirestoreAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be importable", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    expect(FirestoreAdapter).toBeDefined();
  });

  it("should instantiate with a project ID", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");
    expect(adapter).toBeDefined();
  });

  it("should ping successfully", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");
    const result = await adapter.ping();
    expect(result).toBe(true);
  });

  it("should create and get a record", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");

    await adapter.create("skills", "test-1", {
      id: "test-1",
      name: "Test Skill",
      description: "A test",
      version: "1.0.0",
      category: "custom",
    });

    const result = await adapter.get<Record<string, unknown>>("skills", "test-1");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Skill");
  });

  it("should return null for non-existent record", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");
    const result = await adapter.get("skills", "non-existent");
    expect(result).toBeNull();
  });
});
