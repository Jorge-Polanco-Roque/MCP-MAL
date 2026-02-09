-- Migration: Add project_id column to contributions table + missing updated_at columns
-- Run: sqlite3 data/catalog.db < scripts/migrate-contributions-project.sql

ALTER TABLE contributions ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contributions_project ON contributions(project_id);

-- Add updated_at to achievements (was missing, causes SQLiteAdapter.create() to fail)
ALTER TABLE achievements ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Add updated_at to interaction_messages (was missing, causes SQLiteAdapter.create() to fail)
ALTER TABLE interaction_messages ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));
