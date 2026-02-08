import { randomUUID } from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";
import type { ISecrets } from "../services/secrets.js";
import { createAuthMiddleware } from "../services/auth.js";
import { registerAllTools } from "../server.js";
import type { Services } from "../server.js";
import type { Server } from "node:http";

// UUID v4 regex for session ID validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

export interface TransportHandle {
  closeAllSessions(): Promise<void>;
  close(): Promise<void>;
}

export interface HttpTransportOptions {
  port: number;
  host: string;
  secrets: ISecrets;
  services: Services;
}

export async function startHttpTransport(
  serverFactory: () => McpServer,
  options: HttpTransportOptions
): Promise<TransportHandle> {
  const app = express();
  const { port, host, secrets, services } = options;

  // --- Config from env ---
  const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || "1800000"); // 30 min
  const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || "100");
  const CORS_ORIGINS = process.env.CORS_ORIGINS;

  // --- Security headers ---
  app.use(helmet());

  // --- CORS ---
  const corsOrigins = CORS_ORIGINS
    ? CORS_ORIGINS.split(",").map((o) => o.trim())
    : false; // false = no CORS headers (same-origin only)
  app.use(
    cors({
      origin: corsOrigins || false,
      exposedHeaders: ["mcp-session-id"],
    })
  );

  // --- Body limit ---
  app.use(express.json({ limit: "1mb" }));

  // Enable trust proxy for correct req.ip behind Cloud Run
  app.set("trust proxy", true);

  // Session store: map session ID → SessionEntry
  const sessions = new Map<string, SessionEntry>();

  // --- Session cleanup interval ---
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sid, entry] of sessions) {
      if (now - entry.lastActivity > SESSION_TIMEOUT_MS) {
        entry.transport.close().catch(() => {});
        sessions.delete(sid);
        logger.info({ sessionId: sid }, "Session expired (idle timeout)");
      }
    }
  }, 60_000);
  cleanupInterval.unref();

  // Auth middleware for /mcp endpoints
  const authMiddleware = createAuthMiddleware(secrets);

  // POST /mcp — Handle MCP requests (initialize + tool calls)
  app.post("/mcp", authMiddleware, async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      // Validate session ID format if provided
      if (sessionId && !UUID_RE.test(sessionId)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Invalid session ID format" },
          id: null,
        });
        return;
      }

      // Reuse existing transport for active sessions
      if (sessionId && sessions.has(sessionId)) {
        const entry = sessions.get(sessionId)!;
        entry.lastActivity = Date.now();
        await entry.transport.handleRequest(req, res, req.body);
        return;
      }

      // New session: only accept initialization requests
      if (!sessionId && isInitializeRequest(req.body)) {
        // Enforce max sessions limit
        if (sessions.size >= MAX_SESSIONS) {
          logger.warn({ activeSessions: sessions.size }, "Max sessions reached");
          res.status(503).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Server at capacity. Try again later." },
            id: null,
          });
          return;
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            sessions.set(sid, { transport, lastActivity: Date.now() });
            logger.info({ sessionId: sid, activeSessions: sessions.size }, "MCP session initialized");
          },
        });

        // Clean up on close
        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
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
    if (!sessionId || !UUID_RE.test(sessionId) || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }

    const entry = sessions.get(sessionId)!;
    entry.lastActivity = Date.now();
    await entry.transport.handleRequest(req, res);
  });

  // DELETE /mcp — Terminate a session
  app.delete("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !UUID_RE.test(sessionId) || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }

    const entry = sessions.get(sessionId)!;
    await entry.transport.close();
    sessions.delete(sessionId);
    logger.info({ sessionId }, "MCP session terminated by client");
    res.status(204).end();
  });

  // Health endpoint (no auth)
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      activeSessions: sessions.size,
    });
  });

  // Start server
  const httpServer: Server = await new Promise((resolve) => {
    const s = app.listen(port, host, () => {
      logger.info({ port, host }, `MCP Server running on http://${host}:${port}/mcp`);
      resolve(s);
    });
  });

  // --- Transport handle for graceful shutdown ---
  const handle: TransportHandle = {
    async closeAllSessions() {
      const closePromises: Promise<void>[] = [];
      for (const [sid, entry] of sessions) {
        closePromises.push(
          entry.transport.close().catch((err) => {
            logger.warn({ err, sessionId: sid }, "Error closing session during shutdown");
          })
        );
      }
      await Promise.all(closePromises);
      sessions.clear();
    },
    async close() {
      clearInterval(cleanupInterval);
      await handle.closeAllSessions();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };

  return handle;
}
