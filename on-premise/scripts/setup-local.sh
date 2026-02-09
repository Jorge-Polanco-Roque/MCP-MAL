#!/bin/bash
set -euo pipefail

echo "MAL MCP Hub — Setup Local (On-Premise)"

# Create data directories
mkdir -p data/assets/skills data/assets/templates

# Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — edit variables before starting"
fi

# Install dependencies
npm install

# Initialize SQLite
if [ ! -f data/catalog.db ]; then
  echo "Initializing SQLite..."
  npx tsx -e "
    import Database from 'better-sqlite3';
    import { readFileSync } from 'fs';
    const db = new Database('./data/catalog.db');
    const schema = readFileSync('./data/schema.sql', 'utf8');
    db.exec(schema);
    db.close();
    console.log('SQLite initialized');
  "
fi

# Build
npm run build

# Seed catalog (idempotent — skips existing entries)
echo "Seeding catalog..."
npx tsx scripts/seed-full-catalog.ts

echo ""
echo "Setup complete. Options to start:"
echo ""
echo "  stdio mode (recommended for Claude Code):"
echo "    npm run start:stdio"
echo ""
echo "  HTTP mode (for MCP Inspector or LAN access):"
echo "    npm run start:http"
echo ""
