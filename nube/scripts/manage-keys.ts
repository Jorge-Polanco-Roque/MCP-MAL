/**
 * API Key management script for mal-mcp-hub.
 *
 * Usage:
 *   tsx scripts/manage-keys.ts list
 *   tsx scripts/manage-keys.ts add <name>
 *   tsx scripts/manage-keys.ts show <name>
 *   tsx scripts/manage-keys.ts remove <name>
 *
 * Requires: GCP_PROJECT_ID env var + gcloud auth.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { randomBytes } from "node:crypto";

const PROJECT_ID = process.env.GCP_PROJECT_ID;
if (!PROJECT_ID) {
  console.error("Error: Set GCP_PROJECT_ID env var");
  process.exit(1);
}

const SECRET_ID = "API_KEY";
const client = new SecretManagerServiceClient();

async function readKeys(): Promise<Record<string, string>> {
  try {
    const name = `projects/${PROJECT_ID}/secrets/${SECRET_ID}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data;
    if (!payload) return {};

    const raw = typeof payload === "string" ? payload : Buffer.from(payload).toString("utf-8");
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }

    // Migrate from array format
    if (Array.isArray(parsed)) {
      const migrated: Record<string, string> = {};
      parsed.forEach((key: string, i: number) => {
        migrated[`user-${i}`] = key;
      });
      return migrated;
    }

    return { default: raw };
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    if (code === 5) {
      // NOT_FOUND — secret or version doesn't exist yet
      return {};
    }
    throw error;
  }
}

async function writeKeys(keys: Record<string, string>): Promise<void> {
  const payload = JSON.stringify(keys, null, 2);
  const parent = `projects/${PROJECT_ID}/secrets/${SECRET_ID}`;

  await client.addSecretVersion({
    parent,
    payload: { data: Buffer.from(payload, "utf-8") },
  });
}

function generateKey(): string {
  return `mal_${randomBytes(24).toString("base64url")}`;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 8) + "…" + key.slice(-4);
}

async function listKeys(): Promise<void> {
  const keys = await readKeys();
  const entries = Object.entries(keys);

  if (entries.length === 0) {
    console.log("No API keys configured.");
    return;
  }

  console.log(`\n  API Keys (${entries.length}):\n`);
  for (const [name, key] of entries) {
    console.log(`  ${name.padEnd(20)} ${maskKey(key)}`);
  }
  console.log();
}

async function addKey(name: string): Promise<void> {
  const keys = await readKeys();

  if (keys[name]) {
    console.error(`Error: Key "${name}" already exists. Remove it first.`);
    process.exit(1);
  }

  const newKey = generateKey();
  keys[name] = newKey;
  await writeKeys(keys);

  console.log(`\n  Key created for "${name}":\n`);
  console.log(`  ${newKey}\n`);
  console.log(`  Share this key securely. It won't be shown again (use 'show' to retrieve).`);
  console.log();
}

async function showKey(name: string): Promise<void> {
  const keys = await readKeys();

  if (!keys[name]) {
    console.error(`Error: Key "${name}" not found.`);
    process.exit(1);
  }

  console.log(`\n  Key for "${name}":\n`);
  console.log(`  ${keys[name]}\n`);
}

async function removeKey(name: string): Promise<void> {
  const keys = await readKeys();

  if (!keys[name]) {
    console.error(`Error: Key "${name}" not found.`);
    process.exit(1);
  }

  delete keys[name];
  await writeKeys(keys);

  console.log(`\n  Key "${name}" removed. Takes up to 5 min to propagate (secret cache).\n`);
}

// --- CLI ---
const [command, name] = process.argv.slice(2);

switch (command) {
  case "list":
    await listKeys();
    break;

  case "add":
    if (!name) {
      console.error("Usage: manage-keys.ts add <name>");
      process.exit(1);
    }
    await addKey(name);
    break;

  case "show":
    if (!name) {
      console.error("Usage: manage-keys.ts show <name>");
      process.exit(1);
    }
    await showKey(name);
    break;

  case "remove":
    if (!name) {
      console.error("Usage: manage-keys.ts remove <name>");
      process.exit(1);
    }
    await removeKey(name);
    break;

  default:
    console.log(`
  mal-mcp-hub API Key Manager

  Usage:
    tsx scripts/manage-keys.ts list             List all keys (masked)
    tsx scripts/manage-keys.ts add <name>       Generate and add a new key
    tsx scripts/manage-keys.ts show <name>      Show full key for a user
    tsx scripts/manage-keys.ts remove <name>    Revoke a user's key

  Requires: GCP_PROJECT_ID env var + gcloud auth
`);
    break;
}
