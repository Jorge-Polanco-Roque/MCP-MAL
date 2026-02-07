import { ZodError } from "zod";
import { logger } from "./logger.js";

export interface McpErrorResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError: true;
}

export function handleToolError(error: unknown, context: string): McpErrorResponse {
  logger.error({ err: error, context }, "Tool error");

  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    return {
      content: [{ type: "text", text: `Error: Validation failed in ${context}\n\n${issues}\n\nTry: Fix the fields listed above and retry.` }],
      isError: true,
    };
  }

  if (error instanceof Error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}\n\nContext: ${context}\nTry: Check parameters and retry.` }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: `Error: Unknown error in ${context}\n\nTry: Check your request and retry.` }],
    isError: true,
  };
}
