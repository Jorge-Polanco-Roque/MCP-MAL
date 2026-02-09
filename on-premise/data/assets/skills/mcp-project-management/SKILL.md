# MCP Project Management

## Overview

MAL MCP Hub provides a complete project management system through MCP tools. Projects group sprints and work items. Sprints follow an agile lifecycle. Work items are managed on a Kanban board with drag-and-drop. Everything is gamified with XP and leaderboards.

## Entity Hierarchy

```
Project (bella-italia)
├── Sprint (sprint-2026-w07)
│   ├── Work Item (MAL-001) — story, 5 pts, in_progress
│   ├── Work Item (MAL-002) — bug, 3 pts, todo
│   └── Work Item (MAL-003) — task, 2 pts, done
├── Sprint (sprint-2026-w08)
│   └── ...
└── metadata: { repo_url: "https://github.com/..." }
```

## Project Lifecycle

```
mal_create_project → mal_update_project → mal_delete_project
   (planning)          (active/paused)       (cascade option)
```

### Create Project
```
Tool: mal_create_project
Args: { id: "bella-italia", name: "Bella Italia", status: "active",
        color: "green", description: "Voice reservation system",
        metadata: { repo_url: "https://github.com/org/repo/tree/dev" } }
```

### Delete with Cascade
```
Tool: mal_delete_project
Args: { id: "bella-italia", cascade: true }
→ Deletes project + all sprints + all work items
```

## Sprint Lifecycle

```
planned → active → completed
                 → cancelled
```

### Create Sprint
```
Tool: mal_create_sprint
Args: { id: "sprint-2026-w07", name: "Sprint 7 — Gamification",
        goal: "Add XP system and leaderboard",
        start_date: "2026-02-10", end_date: "2026-02-21",
        team_capacity: 40, project_id: "bella-italia" }
```

### Sprint Report (AI-generated)
```
Tool: mal_get_sprint_report
Args: { sprint_id: "sprint-2026-w07" }
→ Returns velocity, burndown data, completion %, AI analysis
```

## Work Item States (Kanban)

```
backlog → todo → in_progress → review → done
                                      → cancelled
```

### Valid Status Values
SQLite CHECK constraint: `backlog`, `todo`, `in_progress`, `review`, `done`, `cancelled`

### Kanban Board Columns (4)
The DnD board shows: `todo` | `in_progress` | `review` | `done`
Items in `backlog` are managed in the Backlog page.

### Create Work Item
```
Tool: mal_create_work_item
Args: { id: "MAL-042", title: "Add per-project leaderboard",
        type: "story", priority: "high", story_points: 8,
        sprint_id: "sprint-2026-w07", assignee: "jorge",
        project_id: "bella-italia" }
```

### Move on Board (status change)
```
Tool: mal_update_work_item
Args: { id: "MAL-042", status: "in_progress" }
```

## Work Item Types

| Type | Use Case |
|------|----------|
| `epic` | Large feature spanning multiple sprints |
| `story` | User-facing feature (has story points) |
| `task` | Technical work (has story points) |
| `bug` | Defect to fix |
| `spike` | Research/investigation (time-boxed) |

## Priority Levels

| Priority | When to Use |
|----------|-------------|
| `critical` | Production down, data loss risk |
| `high` | Blocks other work, sprint commitment |
| `medium` | Normal priority (default) |
| `low` | Nice-to-have, can wait |

## Gamification Integration

- Completing work items → XP awarded (story_points × 10)
- Completing sprints on time → 50 XP bonus
- Commit activity → auto-synced from GitHub repo
- Per-project leaderboard → based on contributions with matching project_id

## Best Practices

1. **Always set project_id** on sprints and work items for proper grouping
2. **Use story points** (Fibonacci: 1, 2, 3, 5, 8, 13) for velocity tracking
3. **Sprint goals** should be concise and measurable
4. **Link repo URL** in project metadata for commit-based leaderboard
5. **Status transitions** should follow the Kanban flow (left to right)
