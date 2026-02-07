import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, unlinkSync, existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SQLiteAdapter } from "../../src/services/local/sqlite.adapter.js";
import { FilesystemAdapter } from "../../src/services/local/filesystem.adapter.js";
import { registerRegistryTools } from "../../src/tools/registry.js";

const TEST_DB_PATH = "./data/test-registry.db";
const TEST_ASSETS_PATH = "./data/test-assets";

function createTestDb(): void {
  const db = new Database(TEST_DB_PATH);
  const schema = readFileSync("./data/schema.sql", "utf8");
  db.exec(schema);
  db.close();
}

function cleanup(): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const path = TEST_DB_PATH + suffix;
    if (existsSync(path)) unlinkSync(path);
  }
  if (existsSync(TEST_ASSETS_PATH)) {
    rmSync(TEST_ASSETS_PATH, { recursive: true, force: true });
  }
}

describe("Registry Tools", () => {
  let db: SQLiteAdapter;
  let storage: FilesystemAdapter;

  beforeEach(() => {
    cleanup();
    createTestDb();
    mkdirSync(TEST_ASSETS_PATH, { recursive: true });
    db = new SQLiteAdapter(TEST_DB_PATH);
    storage = new FilesystemAdapter(TEST_ASSETS_PATH);
  });

  afterEach(() => {
    cleanup();
  });

  it("should register tools on a McpServer", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerRegistryTools(server, db, storage);
    // If no error thrown, tools were registered
    expect(true).toBe(true);
  });

  it("SQLiteAdapter should support full CRUD flow", async () => {
    const skill = {
      id: "crud-test",
      name: "CRUD Test",
      description: "Testing CRUD operations",
      version: "1.0.0",
      category: "custom",
      trigger_patterns: [],
      asset_path: "skills/crud-test/SKILL.md",
      dependencies: [],
      author: "tester",
      tags: ["crud"],
    };

    // Create
    await db.create("skills", skill.id, skill);

    // Read
    const fetched = await db.get<typeof skill>("skills", skill.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("CRUD Test");

    // Update
    await db.update("skills", skill.id, { name: "Updated CRUD" });
    const updated = await db.get<typeof skill>("skills", skill.id);
    expect(updated!.name).toBe("Updated CRUD");

    // Delete
    await db.delete("skills", skill.id);
    const deleted = await db.get("skills", skill.id);
    expect(deleted).toBeNull();
  });
});
