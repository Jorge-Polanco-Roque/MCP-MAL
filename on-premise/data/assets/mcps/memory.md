# Memory (Knowledge Graph)

> Persistent knowledge graph across sessions. Create entities with observations, define relations between them, search/query the graph. Stores data in a local JSONL file. Ideal for maintaining context across conversations and building institutional memory.

- **Transport**: stdio
- **Command**: `npx -y @modelcontextprotocol/server-memory`
- **Author**: Anthropic
- **Status**: active

## Tools Exposed

- `create_entities` — Create new entities in the knowledge graph
- `create_relations` — Define relations between entities
- `add_observations` — Add observations to existing entities
- `delete_entities` — Remove entities from the graph
- `delete_observations` — Remove observations from entities
- `delete_relations` — Remove relations between entities
- `read_graph` — Read the entire knowledge graph
- `search_nodes` — Search for nodes matching a query
- `open_nodes` — Open specific nodes by name

## Configuration

No environment variables required. Data is stored in a local JSONL file.

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```
