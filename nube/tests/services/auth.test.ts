import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createAuthMiddleware, parseApiKeys } from "../../src/services/auth.js";
import type { ISecrets } from "../../src/services/secrets.js";

function createMockSecrets(apiKey: string): ISecrets {
  return {
    get: vi.fn().mockResolvedValue(apiKey),
    has: vi.fn().mockResolvedValue(true),
  };
}

function createMockReq(headers: Record<string, string> = {}): Request {
  return {
    headers,
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;
}

function createMockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("parseApiKeys", () => {
  it("should parse named keys (JSON object)", () => {
    const keys = parseApiKeys(JSON.stringify({ alice: "key-a", bob: "key-b" }));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual({ name: "alice", key: "key-a" });
    expect(keys[1]).toEqual({ name: "bob", key: "key-b" });
  });

  it("should parse JSON array", () => {
    const keys = parseApiKeys(JSON.stringify(["key-1", "key-2"]));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual({ name: "key-0", key: "key-1" });
  });

  it("should parse comma-separated", () => {
    const keys = parseApiKeys("aaa,bbb,ccc");
    expect(keys).toHaveLength(3);
    expect(keys[1]).toEqual({ name: "key-1", key: "bbb" });
  });

  it("should parse single key", () => {
    const keys = parseApiKeys("single-key");
    expect(keys).toEqual([{ name: "default", key: "single-key" }]);
  });
});

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass with valid API key", async () => {
    const secrets = createMockSecrets("valid-key-123");
    const middleware = createAuthMiddleware(secrets);

    const req = createMockReq({ "x-api-key": "valid-key-123" });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should reject invalid API key with 403", async () => {
    const secrets = createMockSecrets("valid-key-123");
    const middleware = createAuthMiddleware(secrets);

    const req = createMockReq({ "x-api-key": "wrong-key" });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("should reject missing x-api-key header with 401", async () => {
    const secrets = createMockSecrets("valid-key-123");
    const middleware = createAuthMiddleware(secrets);

    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("should support multiple API keys (comma-separated)", async () => {
    const secrets = createMockSecrets("key-1,key-2,key-3");
    const middleware = createAuthMiddleware(secrets);

    const req = createMockReq({ "x-api-key": "key-2" });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should support multiple API keys (JSON array)", async () => {
    const secrets = createMockSecrets(JSON.stringify(["key-a", "key-b"]));
    const middleware = createAuthMiddleware(secrets);

    const req = createMockReq({ "x-api-key": "key-b" });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should support named keys (JSON object) and set apiKeyOwner", async () => {
    const secrets = createMockSecrets(JSON.stringify({ alice: "key-alice", bob: "key-bob" }));
    const middleware = createAuthMiddleware(secrets);

    const req = createMockReq({ "x-api-key": "key-bob" });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as Record<string, unknown>).apiKeyOwner).toBe("bob");
  });

  it("should reject API key exceeding max length", async () => {
    const secrets = createMockSecrets("valid-key");
    const middleware = createAuthMiddleware(secrets);

    const longKey = "x".repeat(300);
    const req = createMockReq({ "x-api-key": longKey });
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});
