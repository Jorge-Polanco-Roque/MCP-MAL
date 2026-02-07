import { randomUUID } from "node:crypto";
import express from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";
import type { ISecrets } from "../services/secrets.js";
import { createAuthMiddleware } from "../services/auth.js";
import { registerAllTools } from "../server.js";
import type { Services } from "../server.js";

export interface HttpTransportOptions {
  port: number;
  host: string;
  secrets: ISecrets;
  services: Services;
}

export async function startHttpTransport(
  serverFactory: () => McpServer,
  options: HttpTransportOptions
): Promise<void> {
  const app = express();
  const { port, host, secrets, services } = options;

  app.use(express.json());

  // Session store: map session ID → transport
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Auth middleware for /mcp endpoints
  const authMiddleware = createAuthMiddleware(secrets);

  // POST /mcp — Handle MCP requests (initialize + tool calls)
  app.post("/mcp", authMiddleware, async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      // Reuse existing transport for active sessions
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // New session: only accept initialization requests
      if (!sessionId && isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, transport);
            logger.info({ sessionId: sid }, "MCP session initialized");
          },
        });

        // Clean up on close
        transport.onclose = () => {
          if (transport.sessionId) {
            transports.delete(transport.sessionId);
            logger.info({ sessionId: transport.sessionId }, "MCP session closed");
          }
        };

        // Create a fresh MCP server for this session and register tools
        const server = serverFactory();
        registerAllTools(server, services);
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Invalid request: no session and not an init request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
    } catch (error) {
      logger.error({ err: error }, "MCP POST request error");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // GET /mcp — Handle SSE streams for active sessions
  app.get("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — Terminate a session
  app.delete("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
    logger.info({ sessionId }, "MCP session terminated by client");
    res.status(204).end();
  });

  // Health endpoint (no auth)
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      activeSessions: transports.size,
    });
  });

  app.listen(port, host, () => {
    logger.info({ port, host }, `MCP Server running on http://${host}:${port}/mcp`);
  });
}
