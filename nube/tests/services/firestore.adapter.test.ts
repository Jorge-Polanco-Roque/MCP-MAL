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

  const mockCollection = (name: string) => {
    const getFilteredEntries = (filter?: { key: string; value: unknown }) => {
      const col = store.get(name);
      if (!col) return [];
      let entries = Array.from(col.entries());
      if (filter) {
        entries = entries.filter(([, data]) => data[filter.key] === filter.value);
      }
      return entries;
    };

    const buildQuery = (filter?: { key: string; value: unknown }): Record<string, unknown> => {
      const countFn = () => ({
        get: async () => {
          const entries = getFilteredEntries(filter);
          return { data: () => ({ count: entries.length }) };
        },
      });

      const offsetFn = (off: number) => ({
        limit: (lim: number) => ({
          get: async () => {
            const entries = getFilteredEntries(filter).slice(off, off + lim);
            return {
              docs: entries.map(([id, data]) => ({ id, data: () => data })),
            };
          },
        }),
      });

      return {
        orderBy: () => ({ offset: offsetFn, count: countFn }),
        count: countFn,
        offset: offsetFn,
        where: (key: string, _op: string, value: unknown) => buildQuery({ key, value }),
      };
    };

    return {
      doc: (id: string) => mockDoc(name, id),
      ...buildQuery(),
      where: (key: string, _op: string, value: unknown) => buildQuery({ key, value }),
    };
  };

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

  it("should instantiate with custom database ID", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project", "custom-db");
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

  it("should update a record", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");

    await adapter.create("skills", "upd-1", {
      id: "upd-1",
      name: "Original",
      description: "Before update",
      version: "1.0.0",
      category: "custom",
    });

    const updated = await adapter.update<Record<string, unknown>>("skills", "upd-1", {
      name: "Updated",
      description: "After update",
    });

    expect(updated.name).toBe("Updated");
    expect(updated.description).toBe("After update");
  });

  it("should delete a record", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");

    await adapter.create("skills", "del-1", {
      id: "del-1",
      name: "To Delete",
      description: "Will be deleted",
      version: "1.0.0",
      category: "custom",
    });

    await adapter.delete("skills", "del-1");
    const result = await adapter.get("skills", "del-1");
    expect(result).toBeNull();
  });

  it("should list with pagination", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");

    for (let i = 0; i < 5; i++) {
      await adapter.create("paginated", `item-${i}`, {
        id: `item-${i}`,
        name: `Item ${i}`,
        description: `Description ${i}`,
        category: "test",
      });
    }

    const page1 = await adapter.list("paginated", { limit: 2, offset: 0 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.has_more).toBe(true);
    expect(page1.next_offset).toBe(2);

    const page3 = await adapter.list("paginated", { limit: 2, offset: 4 });
    expect(page3.items).toHaveLength(1);
    expect(page3.has_more).toBe(false);
  });
});
