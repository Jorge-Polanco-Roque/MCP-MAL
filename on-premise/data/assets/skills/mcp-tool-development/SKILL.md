# MCP Tool Development

## Overview
Guide for building MCP (Model Context Protocol) tools using the official SDK. MAL uses server.registerTool() with Zod schemas and structured annotations.

## Tool Registration Pattern
```typescript
import { z } from "zod";

server.registerTool("mal_my_tool", {
  title: "Human-Readable Title",
  description: "Detailed description for LLM discoverability. Explain what the tool does, when to use it, and what it returns.",
  annotations: {
    readOnlyHint: true,     // Safe to call without side effects
    // destructiveHint: true,  // Deletes data (requires confirmation)
    // openWorldHint: true,    // Makes external network calls
  },
  inputSchema: {
    query: z.string().describe("Search query text"),
    limit: z.number().optional().describe("Max results (default 20)"),
    category: z.enum(["devops", "frontend"]).optional().describe("Filter by category"),
  },
}, async (args) => {
  try {
    const results = await db.list(COLLECTIONS.SKILLS, {
      filters: { category: args.category },
      limit: args.limit ?? 20,
    });

    return {
      content: [{
        type: "text" as const,
        text: formatAsMarkdown(results),
      }],
    };
  } catch (error) {
    return handleToolError(error, "mal_my_tool");
  }
});
```

## Naming Convention
- Prefix: `mal_` (Monterrey Agentic Labs)
- Pattern: `mal_{action}_{resource}` (snake_case)
- Examples: `mal_list_skills`, `mal_create_sprint`, `mal_get_leaderboard`

## Error Response Pattern
```typescript
return {
  content: [{ type: "text" as const, text: "Error: Not found. Try: Use mal_list_skills first." }],
  isError: true,
};
```

## Testing with MCP Inspector
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Key Rules
- Every inputSchema field MUST have .describe() for LLM discoverability
- Use .strict() on all Zod object schemas to catch extra fields
- Always handle errors with handleToolError()
- Return markdown-formatted text for readability
- Use annotations correctly (readOnlyHint for GETs, destructiveHint for DELETEs)
