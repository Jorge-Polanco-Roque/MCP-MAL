import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./server.js";
import { startHttpTransport } from "./transport/http.js";
import { startStdioTransport } from "./transport/stdio.js";
import { FirestoreAdapter } from "./services/gcp/firestore.adapter.js";
import { GCSAdapter } from "./services/gcp/gcs.adapter.js";
import { SecretManagerAdapter } from "./services/gcp/secret-manager.adapter.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { logger } from "./utils/logger.js";

function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
}

async function main() {
  const transport = process.env.TRANSPORT || "http";

  logger.info({ transport }, `Starting ${SERVER_NAME} v${SERVER_VERSION} (GCP Cloud)`);

  // Validate required env vars
  const firestoreProject = process.env.FIRESTORE_PROJECT;
  const gcsBucket = process.env.GCS_BUCKET;
  const gcpProjectId = process.env.GCP_PROJECT_ID;

  if (!firestoreProject) throw new Error("FIRESTORE_PROJECT env var is required");
  if (!gcsBucket) throw new Error("GCS_BUCKET env var is required");
  if (!gcpProjectId) throw new Error("GCP_PROJECT_ID env var is required");

  // Create GCP services
  const db = new FirestoreAdapter(firestoreProject);
  const storage = new GCSAdapter(gcsBucket);
  const secrets = new SecretManagerAdapter(gcpProjectId);

  // Verify connectivity
  const dbOk = await db.ping();
  if (!dbOk) throw new Error("Firestore connection failed");
  logger.info("Firestore connected");

  const services = { db, storage };

  // Start transport
  if (transport === "http") {
    // HTTP: factory pattern — each session gets its own McpServer instance
    await startHttpTransport(createServer, {
      port: parseInt(process.env.PORT || "3000"),
      host: process.env.HOST || "0.0.0.0",
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
