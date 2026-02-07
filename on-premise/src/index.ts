import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./server.js";
import { startHttpTransport } from "./transport/http.js";
import { startStdioTransport } from "./transport/stdio.js";
import { SQLiteAdapter } from "./services/local/sqlite.adapter.js";
import { FilesystemAdapter } from "./services/local/filesystem.adapter.js";
import { DotenvAdapter } from "./services/local/dotenv.adapter.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { logger } from "./utils/logger.js";

function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
}

async function main() {
  const transport = process.env.TRANSPORT || "stdio";

  logger.info({ transport }, `Starting ${SERVER_NAME} v${SERVER_VERSION} (on-premise)`);

  // Create local services
  const dbPath = process.env.SQLITE_PATH || "./data/catalog.db";
  const assetsPath = process.env.ASSETS_PATH || "./data/assets";

  const db = new SQLiteAdapter(dbPath);
  const storage = new FilesystemAdapter(assetsPath);
  const secrets = new DotenvAdapter();

  // Verify connectivity
  const dbOk = await db.ping();
  if (!dbOk) throw new Error("SQLite database connection failed");
  logger.info("Database connected");

  const services = { db, storage };

  // Start transport
  if (transport === "http") {
    // HTTP: factory pattern — each session gets its own McpServer instance
    await startHttpTransport(createServer, {
      port: parseInt(process.env.PORT || "3000"),
      host: process.env.HOST || "127.0.0.1",
      secrets,
      services,
    });
  } else {
    // stdio: single server instance
    const server = createServer();
    registerAllTools(server, services);
    await startStdioTransport(server);
  }
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
