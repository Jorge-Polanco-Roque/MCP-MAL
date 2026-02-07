import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { SQLiteAdapter } from "../../src/services/local/sqlite.adapter.js";

const TEST_DB_PATH = "./data/test-commands.db";

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
}

describe("Commands", () => {
  let db: SQLiteAdapter;

  beforeEach(() => {
    cleanup();
    createTestDb();
    db = new SQLiteAdapter(TEST_DB_PATH);
  });

  afterEach(() => {
    cleanup();
  });

  it("should create and retrieve a command", async () => {
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

    await db.create("commands", command.id, command);
    const result = await db.get<typeof command>("commands", "test-cmd");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Command");
    expect(result!.parameters).toHaveLength(1);
    expect(result!.parameters[0].name).toBe("message");
  });

  it("should list commands with filters", async () => {
    await db.create("commands", "cmd-1", {
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

    await db.create("commands", "cmd-2", {
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

    const devops = await db.list("commands", { filters: { category: "devops" } });
    expect(devops.items).toHaveLength(1);

    const all = await db.list("commands");
    expect(all.items).toHaveLength(2);
  });
});
