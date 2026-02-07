import type { Request, Response, NextFunction } from "express";
import type { ISecrets } from "./secrets.js";

export function createAuthMiddleware(secrets: ISecrets) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers["x-api-key"] as string | undefined;

    if (!apiKey) {
      res.status(401).json({ error: "Missing x-api-key header" });
      return;
    }

    const validKey = await secrets.get("API_KEY");
    if (apiKey !== validKey) {
      res.status(403).json({ error: "Invalid API key" });
      return;
    }

    next();
  };
}
