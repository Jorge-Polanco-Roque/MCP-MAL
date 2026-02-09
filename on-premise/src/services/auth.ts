import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import type { ISecrets } from "./secrets.js";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function createAuthMiddleware(secrets: ISecrets) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers["x-api-key"] as string | undefined;

    if (!apiKey) {
      res.status(401).json({ error: "Missing x-api-key header" });
      return;
    }

    if (apiKey.length > 256) {
      res.status(400).json({ error: "API key too long" });
      return;
    }

    const validKey = await secrets.get("API_KEY");
    if (!validKey || !safeCompare(apiKey, validKey)) {
      res.status(403).json({ error: "Invalid API key" });
      return;
    }

    next();
  };
}
