# Seed Catalog

> Run the seed script to populate initial catalog data. Uses tsx to execute TypeScript directly.

- **Category**: database
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: seed, catalog, database

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `project_root` | string | yes | — | Root path of the v001 project |

## Script

```bash
#!/bin/bash
set -e
cd "{{project_root}}/on-premise"
echo "Seeding catalog..."
npx tsx scripts/seed-full-catalog.ts
echo "Seed complete."
```
