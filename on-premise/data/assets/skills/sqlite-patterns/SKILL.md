# SQLite Best Practices

## Overview
SQLite patterns used in MAL's on-premise deployment. Covers WAL mode, FTS5, JSON storage, and production hardening.

## WAL Mode
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```
WAL (Write-Ahead Logging) allows concurrent reads during writes. Always enable for server applications.

## FTS5 Full-Text Search
```sql
CREATE VIRTUAL TABLE catalog_fts USING fts5(
    id, name, description, tags, collection,
    content='',
    tokenize='porter unicode61'
);

-- Search
SELECT * FROM catalog_fts WHERE catalog_fts MATCH 'docker OR deploy';
```

## JSON Storage
SQLite stores arrays and objects as JSON strings:
```typescript
// Serialize on write
const tags = JSON.stringify(["docker", "devops"]);

// Deserialize on read
const parsed = JSON.parse(row.tags);
```

## Boolean Handling
SQLite has no native boolean. Store as INTEGER (0/1):
```typescript
function serializeValue(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return value;
}
```

## Index Strategy
```sql
-- Filter columns
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_sprint ON work_items(sprint_id);

-- Composite for common queries
CREATE INDEX idx_items_sprint_status ON work_items(sprint_id, status);
```

## Backup
```bash
# Online backup (safe even during writes with WAL)
sqlite3 catalog.db ".backup backup-$(date +%Y%m%d).db"
```

## Best Practices
- Use prepared statements (never string interpolation)
- Wrap multi-row inserts in transactions
- Use INSERT OR IGNORE for idempotent seeding
- Keep WAL file size manageable with periodic checkpoints
- Test with :memory: database in unit tests
