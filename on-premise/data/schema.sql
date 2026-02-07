CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    category TEXT NOT NULL CHECK(category IN ('data','document','devops','frontend','design','custom')),
    trigger_patterns TEXT NOT NULL DEFAULT '[]',
    asset_path TEXT NOT NULL,
    dependencies TEXT NOT NULL DEFAULT '[]',
    author TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    shell TEXT NOT NULL CHECK(shell IN ('bash','python','node')),
    script_template TEXT NOT NULL,
    parameters TEXT NOT NULL DEFAULT '[]',
    requires_confirmation INTEGER NOT NULL DEFAULT 0,
    author TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subagents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
    tools_allowed TEXT NOT NULL DEFAULT '[]',
    max_turns INTEGER NOT NULL DEFAULT 5,
    input_schema TEXT NOT NULL DEFAULT '{}',
    output_format TEXT NOT NULL DEFAULT 'markdown' CHECK(output_format IN ('text','json','markdown')),
    author TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    transport TEXT NOT NULL CHECK(transport IN ('streamable-http','stdio')),
    endpoint_url TEXT,
    command TEXT,
    args TEXT NOT NULL DEFAULT '[]',
    env_vars TEXT NOT NULL DEFAULT '{}',
    health_check_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','error')),
    tools_exposed TEXT NOT NULL DEFAULT '[]',
    author TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(
    id,
    name,
    description,
    tags,
    collection,
    content='',
    tokenize='porter unicode61'
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    resource_id TEXT,
    user_key TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    duration_ms INTEGER,
    success INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_tool ON usage_log(tool_name);
