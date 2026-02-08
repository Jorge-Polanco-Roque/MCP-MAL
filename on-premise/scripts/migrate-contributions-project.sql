-- Migration: Add project_id column to contributions table
-- Run: sqlite3 data/catalog.db < scripts/migrate-contributions-project.sql

ALTER TABLE contributions ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contributions_project ON contributions(project_id);
