import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firestore — store is reset via beforeEach
const firestoreStore = new Map<string, Map<string, Record<string, unknown>>>();

vi.mock("@google-cloud/firestore", () => {
  const store = firestoreStore;

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

      const offsetFn = () => ({
        limit: () => ({
          get: async () => {
            const entries = getFilteredEntries(filter);
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

describe("Commands (GCP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreStore.clear();
  });

  it("should create and retrieve a command", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");

    const command = {
      id: "test-cmd",
      name: "Test Command",
      description: "Echo a message",
      category: "test",
      shell: "bash",
      script_template: "echo {{message}}",
      parameters: [
        { name: "message", type: "string", description: "Message", required: true },
      ],
      requires_confirmation: false,
      author: "tester",
      tags: ["test"],
    };

    await adapter.create("commands", command.id, command);
    const result = await adapter.get<typeof command>("commands", "test-cmd");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Command");
    expect(result!.parameters).toHaveLength(1);
    expect(result!.parameters[0].name).toBe("message");
  });

  it("should list commands with filters", async () => {
    const { FirestoreAdapter } = await import("../../src/services/gcp/firestore.adapter.js");
    const adapter = new FirestoreAdapter("test-project");

    await adapter.create("commands", "cmd-1", {
      id: "cmd-1",
      name: "Command 1",
      description: "First command",
      category: "devops",
      shell: "bash",
      script_template: "echo 1",
      parameters: [],
      requires_confirmation: false,
      author: "tester",
      tags: [],
    });

    await adapter.create("commands", "cmd-2", {
      id: "cmd-2",
      name: "Command 2",
      description: "Second command",
      category: "git",
      shell: "bash",
      script_template: "echo 2",
      parameters: [],
      requires_confirmation: false,
      author: "tester",
      tags: [],
    });

    const devops = await adapter.list("commands", { filters: { category: "devops" } });
    expect(devops.items).toHaveLength(1);

    const all = await adapter.list("commands");
    expect(all.items).toHaveLength(2);
  });
});
