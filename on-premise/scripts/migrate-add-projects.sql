-- Migration: Add projects table and project_id to sprints/work_items
-- Run against an existing catalog.db to add project support.
-- Safe to run multiple times (uses IF NOT EXISTS / catches errors).

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('planning','active','paused','completed','archived')),
    owner_id TEXT,
    color TEXT NOT NULL DEFAULT 'blue',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 2. Add project_id to sprints (ALTER TABLE ADD COLUMN errors if already exists — ignore)
ALTER TABLE sprints ADD COLUMN project_id TEXT;

-- 3. Add project_id to work_items
ALTER TABLE work_items ADD COLUMN project_id TEXT;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items(project_id);

-- 5. Seed projects
INSERT OR IGNORE INTO projects (id, name, description, status, owner_id, color, metadata)
VALUES ('bella-italia', 'Bella Italia', 'Restaurant website MVP — menu, reservations, online ordering', 'active', 'jorge', 'green', '{}');

INSERT OR IGNORE INTO projects (id, name, description, status, owner_id, color, metadata)
VALUES ('voice-service', 'Voice Service', 'Twilio voice assistant for restaurant reservations', 'active', 'jorge', 'purple', '{}');

-- 6. Assign existing data to projects
UPDATE sprints SET project_id = 'bella-italia' WHERE id IN ('bella-sprint-01', 'sprint-1') AND project_id IS NULL;
UPDATE sprints SET project_id = 'voice-service' WHERE id LIKE 'vs-sprint-%' AND project_id IS NULL;

UPDATE work_items SET project_id = 'bella-italia' WHERE (id LIKE 'BI-%' OR id = 'WI-001') AND project_id IS NULL;
UPDATE work_items SET project_id = 'voice-service' WHERE id LIKE 'VS-%' AND project_id IS NULL;
