import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { SQLiteAdapter } from "../../src/services/local/sqlite.adapter.js";

const TEST_DB_PATH = "./data/test-catalog.db";

function createTestDb(): void {
  const db = new Database(TEST_DB_PATH);
  const schema = readFileSync("./data/schema.sql", "utf8");
  db.exec(schema);
  db.close();
}

function cleanupTestDb(): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const path = TEST_DB_PATH + suffix;
    if (existsSync(path)) unlinkSync(path);
  }
}

describe("SQLiteAdapter", () => {
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    cleanupTestDb();
    createTestDb();
    adapter = new SQLiteAdapter(TEST_DB_PATH);
  });

  afterEach(() => {
    cleanupTestDb();
  });

  it("should ping successfully", async () => {
    const result = await adapter.ping();
    expect(result).toBe(true);
  });

  it("should create and get a record", async () => {
    const skill = {
      id: "test-skill",
      name: "Test Skill",
      description: "A test skill",
      version: "1.0.0",
      category: "custom",
      trigger_patterns: [],
      asset_path: "skills/test/SKILL.md",
      dependencies: [],
      author: "tester",
      tags: ["test"],
    };

    await adapter.create("skills", skill.id, skill);
    const result = await adapter.get<typeof skill>("skills", "test-skill");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Skill");
    expect(result!.tags).toEqual(["test"]);
  });

  it("should list records with pagination", async () => {
    for (let i = 0; i < 5; i++) {
      await adapter.create("skills", `skill-${i}`, {
        id: `skill-${i}`,
        name: `Skill ${i}`,
        description: `Description ${i}`,
        version: "1.0.0",
        category: "custom",
        trigger_patterns: [],
        asset_path: `skills/skill-${i}/SKILL.md`,
        dependencies: [],
        author: "tester",
        tags: [],
      });
    }

    const page1 = await adapter.list("skills", { limit: 2, offset: 0 });
    expect(page1.items.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.has_more).toBe(true);

    const page2 = await adapter.list("skills", { limit: 2, offset: 2 });
    expect(page2.items.length).toBe(2);
    expect(page2.has_more).toBe(true);
  });

  it("should update a record", async () => {
    await adapter.create("skills", "update-test", {
      id: "update-test",
      name: "Original",
      description: "Original desc",
      version: "1.0.0",
      category: "custom",
      trigger_patterns: [],
      asset_path: "skills/test/SKILL.md",
      dependencies: [],
      author: "tester",
      tags: [],
    });

    const updated = await adapter.update<Record<string, unknown>>("skills", "update-test", {
      name: "Updated",
      description: "Updated desc",
    });

    expect(updated.name).toBe("Updated");
    expect(updated.description).toBe("Updated desc");
  });

  it("should delete a record", async () => {
    await adapter.create("skills", "delete-test", {
      id: "delete-test",
      name: "To Delete",
      description: "Will be deleted",
      version: "1.0.0",
      category: "custom",
      trigger_patterns: [],
      asset_path: "skills/test/SKILL.md",
      dependencies: [],
      author: "tester",
      tags: [],
    });

    await adapter.delete("skills", "delete-test");
    const result = await adapter.get("skills", "delete-test");
    expect(result).toBeNull();
  });

  it("should return null for non-existent record", async () => {
    const result = await adapter.get("skills", "non-existent");
    expect(result).toBeNull();
  });
});
