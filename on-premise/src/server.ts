import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IDatabase } from "./services/database.js";
import type { IStorage } from "./services/storage.js";
import { registerRegistryTools } from "./tools/registry.js";
import { registerSkillTools } from "./tools/skills.js";
import { registerCommandTools } from "./tools/commands.js";
import { registerSubagentTools } from "./tools/subagents.js";
import { registerMCPProxyTools } from "./tools/mcp-proxy.js";
import { registerMetaTools } from "./tools/meta.js";

export interface Services {
  db: IDatabase;
  storage: IStorage;
}

export function registerAllTools(server: McpServer, services: Services): void {
  const { db, storage } = services;

  registerRegistryTools(server, db, storage);
  registerSkillTools(server, db, storage);
  registerCommandTools(server, db);
  registerSubagentTools(server, db);
  registerMCPProxyTools(server, db);
  registerMetaTools(server, db);
}
