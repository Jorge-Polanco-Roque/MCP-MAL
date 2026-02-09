# SQLite Backup

> Copy SQLite DB + WAL to timestamped backup file. Safe for online databases using WAL mode.

- **Category**: database
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: sqlite, backup, database

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `db_path` | string | yes | `./data/catalog.db` | Path to SQLite database file |

## Script

```bash
#!/bin/bash
set -e
DB="{{db_path}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP="${DB%.db}-backup-$TIMESTAMP.db"
echo "Backing up $DB to $BACKUP..."
sqlite3 "$DB" ".backup '$BACKUP'"
echo "Backup complete: $BACKUP ($(du -h "$BACKUP" | cut -f1))"
```
