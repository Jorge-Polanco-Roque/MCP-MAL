# Software Architecture

Quality-focused software architecture guidance based on Clean Architecture and Domain-Driven Design principles.

Adapted from [NeoLabHQ/context-engineering-kit](https://github.com/NeoLabHQ/context-engineering-kit).

## Code Style Rules

### General Principles

- **Early return pattern**: Always use early returns over nested conditions for better readability
- Avoid code duplication through reusable functions and modules
- Decompose long functions (>80 lines) into smaller ones; split files >200 lines
- Use arrow functions instead of function declarations when possible

### Library-First Approach

**ALWAYS search for existing solutions before writing custom code:**

- Check npm/PyPI for existing libraries
- Evaluate existing services/SaaS solutions
- Consider third-party APIs for common functionality

**When custom code IS justified:**

- Specific business logic unique to the domain
- Performance-critical paths with special requirements
- Security-sensitive code requiring full control
- When external dependencies would be overkill

### Architecture and Design

**Clean Architecture & DDD Principles:**

- Follow domain-driven design and ubiquitous language
- Separate domain entities from infrastructure concerns
- Keep business logic independent of frameworks
- Define use cases clearly and keep them isolated

**Naming Conventions:**

- **AVOID** generic names: `utils`, `helpers`, `common`, `shared`
- **USE** domain-specific names: `OrderCalculator`, `UserAuthenticator`, `InvoiceGenerator`
- Follow bounded context naming patterns
- Each module should have a single, clear purpose

**Separation of Concerns:**

- Do NOT mix business logic with UI components
- Keep database queries out of controllers
- Maintain clear boundaries between contexts

## MAL Architecture Patterns

### Adapter Pattern (Core Abstraction)

MAL uses three service interfaces for deployment-path independence:

```typescript
// src/services/database.ts — IDatabase
interface IDatabase {
  get<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  create<T>(collection: string, id: string, data: T): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<void>;
  search<T>(collection: string, query: string, opts?: QueryOptions): Promise<PaginatedResult<T>>;
  ping(): Promise<boolean>;
}
```

Implementations:
- `SQLiteAdapter` (on-premise) — local SQLite with WAL mode, FTS5
- `FirestoreAdapter` (nube) — GCP Firestore with composite indexes

### Tool Registration Pattern

All 51 MCP tools follow this structure:

```typescript
server.registerTool("mal_tool_name", {
  title: "Human-readable Title",
  description: "What this tool does — detailed for LLM discoverability",
  annotations: { readOnlyHint: true },
  inputSchema: {
    param: z.string().describe("Parameter description for the LLM"),
    optional_param: z.number().optional().describe("Optional parameter"),
  },
}, async (args) => {
  try {
    // Business logic
    return { content: [{ type: "text" as const, text: "markdown result" }] };
  } catch (error) {
    return handleToolError(error, "mal_tool_name");
  }
});
```

### Error Handling

```typescript
// Consistent error response format across all tools
function handleToolError(error: unknown, toolName: string): McpErrorResponse {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ tool: toolName, error: message }, "Tool error");
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Error: ${message}. Try again.` }],
  };
}
```

## Anti-Patterns to Avoid

- **NIH Syndrome**: Don't build custom auth when established solutions exist
- **Mixing concerns**: Business logic in UI components or DB queries in controllers
- **Generic naming**: `utils.js` with 50 unrelated functions
- **Deep nesting**: Max 3 levels; use early returns and guards

## File Organization

```
src/
├── tools/          ← MCP tool handlers (one file per domain)
├── schemas/        ← Zod validation schemas (.strict())
├── services/       ← Adapter interfaces + implementations
│   ├── database.ts ← IDatabase interface
│   ├── storage.ts  ← IStorage interface
│   ├── secrets.ts  ← ISecrets interface
│   └── local/      ← SQLiteAdapter, FilesystemAdapter, DotenvAdapter
├── transport/      ← HTTP/stdio transport
├── utils/          ← Cross-cutting: logger, pagination, error handling
└── types.ts        ← Shared TypeScript types
```

Key conventions:
- Files: kebab-case
- Interfaces: PascalCase
- Constants: UPPER_SNAKE
- Tool names: `mal_{action}_{resource}` (snake_case)
- ESM imports with `.js` extension
