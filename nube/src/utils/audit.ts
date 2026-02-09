import type { IDatabase } from "../services/database.js";
import { COLLECTIONS } from "../constants.js";
import { logger } from "./logger.js";

export interface AuditEntry {
  id: number;
  tool_name: string;
  resource_id?: string;
  user_key?: string;
  timestamp: string;
  duration_ms?: number;
  success: number;
}

/**
 * Log a tool invocation to the usage_log table.
 */
export async function logToolUsage(
  db: IDatabase,
  toolName: string,
  resourceId: string | undefined,
  durationMs: number,
  success: boolean,
): Promise<void> {
  try {
    await db.create(COLLECTIONS.USAGE_LOG, "", {
      tool_name: toolName,
      resource_id: resourceId ?? null,
      user_key: null,
      duration_ms: Math.round(durationMs),
      success: success ? 1 : 0,
    });
  } catch (err) {
    logger.warn({ err, toolName }, "Failed to log tool usage");
  }
}

/**
 * Higher-order function that wraps a tool handler with audit logging.
 * Captures timing, success/failure, and the first ID-like argument as resource_id.
 */
export function withAudit<TArgs extends Record<string, unknown>>(
  toolName: string,
  handler: (args: TArgs) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean; [key: string]: unknown }>,
  db: IDatabase,
): (args: TArgs) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean; [key: string]: unknown }> {
  return async (args: TArgs) => {
    const start = performance.now();
    let success = true;
    let resourceId: string | undefined;

    // Extract resource_id from common arg patterns
    if (typeof args.id === "string") resourceId = args.id;
    else if (typeof args.sprint_id === "string") resourceId = args.sprint_id;

    try {
      const result = await handler(args);
      if (result.isError) success = false;
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const duration = performance.now() - start;
      void logToolUsage(db, toolName, resourceId, duration, success);
    }
  };
}
