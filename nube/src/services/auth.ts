import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { ISecrets } from "./secrets.js";
import { logger } from "../utils/logger.js";

interface RateLimitEntry {
  failures: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_FAILURES = 10;
const MAX_API_KEY_LENGTH = 256;

// In-memory rate limit store (per IP)
const rateLimitStore = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string): boolean {
  const entry = rateLimitStore.get(ip);
  if (!entry) return false;

  const now = Date.now();
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.delete(ip);
    return false;
  }

  return entry.failures >= RATE_LIMIT_MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { failures: 1, windowStart: now });
    return;
  }

  entry.failures++;
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Compare against self to keep constant time, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Parse API keys from Secret Manager value.
 * Supports 4 formats:
 *   1. Named keys (recommended): {"alice": "key-xxx", "bob": "key-yyy"}
 *   2. JSON array: ["key1", "key2"]
 *   3. Comma-separated: "key1,key2"
 *   4. Single key: "mykey123"
 *
 * Returns array of { name, key } pairs.
 */
function parseApiKeys(raw: string): Array<{ name: string; key: string }> {
  try {
    const parsed = JSON.parse(raw);

    // Format 1: Named keys — { "alice": "key-xxx" }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([name, key]) => ({
        name,
        key: String(key),
      }));
    }

    // Format 2: JSON array — ["key1", "key2"]
    if (Array.isArray(parsed)) {
      return parsed.map((key, i) => ({
        name: `key-${i}`,
        key: String(key),
      }));
    }
  } catch {
    // Not JSON — fall through
  }

  // Format 3: Comma-separated — "key1,key2"
  if (raw.includes(",")) {
    return raw.split(",").map((k, i) => ({
      name: `key-${i}`,
      key: k.trim(),
    }));
  }

  // Format 4: Single key
  return [{ name: "default", key: raw }];
}

export function createAuthMiddleware(secrets: ISecrets) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip ?? req.socket.remoteAddress ?? "unknown";

    // Check rate limit
    if (isRateLimited(clientIp)) {
      logger.warn({ ip: clientIp }, "Auth rate limited");
      res.status(429).json({ error: "Too many failed attempts. Try again later." });
      return;
    }

    const apiKey = req.headers["x-api-key"] as string | undefined;

    if (!apiKey) {
      recordFailure(clientIp);
      logger.warn({ ip: clientIp }, "Auth failure: missing x-api-key");
      res.status(401).json({ error: "Missing x-api-key header" });
      return;
    }

    if (apiKey.length > MAX_API_KEY_LENGTH) {
      recordFailure(clientIp);
      logger.warn({ ip: clientIp }, "Auth failure: API key too long");
      res.status(400).json({ error: "Invalid API key format" });
      return;
    }

    const validKeysRaw = await secrets.get("API_KEY");
    const validKeys = parseApiKeys(validKeysRaw);

    // Find matching key
    const matched = validKeys.find((entry) => timingSafeCompare(apiKey, entry.key));

    if (!matched) {
      recordFailure(clientIp);
      logger.warn({ ip: clientIp }, "Auth failure: invalid API key");
      res.status(403).json({ error: "Invalid API key" });
      return;
    }

    // Attach user identity for downstream logging
    (req as unknown as Record<string, unknown>).apiKeyOwner = matched.name;
    logger.info({ ip: clientIp, user: matched.name }, "Auth success");

    next();
  };
}

// Export for testing
export { parseApiKeys };
