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

-- ============================================================
-- Phase 5: Team Collaboration Platform tables
-- ============================================================

-- Team member profiles
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'developer' CHECK(role IN ('developer','lead','scrum_master','product_owner')),
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak_days INTEGER NOT NULL DEFAULT 0,
    streak_last_date TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Interaction sessions (conversation units)
CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'claude_code' CHECK(source IN ('claude_code','web_chat','api')),
    title TEXT,
    summary TEXT,
    decisions TEXT NOT NULL DEFAULT '[]',
    action_items TEXT NOT NULL DEFAULT '[]',
    tools_used TEXT NOT NULL DEFAULT '[]',
    sprint_id TEXT,
    work_item_id TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    message_count INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual messages within an interaction
CREATE TABLE IF NOT EXISTS interaction_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('human','assistant','tool')),
    content TEXT NOT NULL,
    tool_calls TEXT,
    token_count INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (interaction_id) REFERENCES interactions(id)
);

-- Sprint definitions
CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','completed','cancelled')),
    velocity INTEGER,
    team_capacity INTEGER,
    summary TEXT,
    retrospective TEXT,
    created_by TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Work items (tasks, stories, bugs — Jira-like)
CREATE TABLE IF NOT EXISTS work_items (
    id TEXT PRIMARY KEY,
    sprint_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'task' CHECK(type IN ('epic','story','task','bug','spike')),
    status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog','todo','in_progress','review','done','cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('critical','high','medium','low')),
    story_points INTEGER,
    assignee TEXT,
    reporter TEXT,
    labels TEXT NOT NULL DEFAULT '[]',
    parent_id TEXT,
    due_date TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contribution events (for gamification scoring)
CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('commit','interaction','work_item','review','sprint','achievement')),
    reference_id TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('code','collaboration','agile','exploration','mastery')),
    tier TEXT NOT NULL DEFAULT 'bronze' CHECK(tier IN ('bronze','silver','gold','platinum')),
    xp_reward INTEGER NOT NULL DEFAULT 10,
    criteria TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User-achievement junction (unlocked badges)
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES team_members(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_sprint ON interactions(sprint_id);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_interaction_messages_interaction ON interaction_messages(interaction_id);
CREATE INDEX IF NOT EXISTS idx_work_items_sprint ON work_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON contributions(type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

-- Full-text search for interactions
CREATE VIRTUAL TABLE IF NOT EXISTS interactions_fts USING fts5(
    id,
    title,
    summary,
    tags,
    content='',
    tokenize='porter unicode61'
);
