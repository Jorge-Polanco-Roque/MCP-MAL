# Context7

> Up-to-date library documentation lookup via MCP. Resolves library IDs and queries current docs/code examples. Eliminates stale LLM knowledge for any npm, PyPI, or Cargo package.

- **Transport**: streamable-http
- **Endpoint**: `https://mcp.context7.com/mcp`
- **Author**: Upstash
- **Status**: active

## Tools Exposed

- `resolve-library-id` — Resolve a package name to a Context7-compatible library ID
- `query-docs` — Query up-to-date documentation and code examples for a library

## Configuration

No environment variables required. Connect directly via the HTTP endpoint.

```json
{
  "type": "http",
  "url": "https://mcp.context7.com/mcp"
}
```

Or via stdio:

```json
{
  "command": "npx",
  "args": ["@upstash/context7-mcp"]
}
```
