# Reset Database

> Drop and recreate all SQLite tables from schema.sql. DESTRUCTIVE — all data will be lost.

- **Category**: database
- **Shell**: bash
- **Requires Confirmation**: yes
- **Author**: MAL Team
- **Tags**: sqlite, reset, database, destructive

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `db_path` | string | yes | `./data/catalog.db` | Path to SQLite database file |
| `schema_path` | string | yes | `./data/schema.sql` | Path to schema.sql file |

## Script

```bash
#!/bin/bash
set -e
DB="{{db_path}}"
SCHEMA="{{schema_path}}"
echo "WARNING: This will delete ALL data in $DB"
echo "Resetting database..."
rm -f "$DB" "$DB-wal" "$DB-shm"
sqlite3 "$DB" < "$SCHEMA"
echo "Database reset from $SCHEMA"
echo "Tables:"
sqlite3 "$DB" ".tables"
```
