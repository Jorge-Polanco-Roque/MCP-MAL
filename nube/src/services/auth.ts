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

    // Support multiple keys: comma-separated or JSON array
    let validKeys: string[];
    try {
      const parsed = JSON.parse(validKeysRaw);
      validKeys = Array.isArray(parsed) ? parsed : [validKeysRaw];
    } catch {
      validKeys = validKeysRaw.includes(",")
        ? validKeysRaw.split(",").map((k) => k.trim())
        : [validKeysRaw];
    }

    const isValid = validKeys.some((key) => timingSafeCompare(apiKey, key));

    if (!isValid) {
      recordFailure(clientIp);
      logger.warn({ ip: clientIp }, "Auth failure: invalid API key");
      res.status(403).json({ error: "Invalid API key" });
      return;
    }

    next();
  };
}
