# Team Onboarding

## Overview
Step-by-step guide for new team members joining the MAL platform team.

## Day 1: Environment Setup

### 1. Clone the Repository
```bash
git clone <repo-url>
cd v001
```

### 2. Install Dependencies
```bash
# MCP Server (on-premise)
cd on-premise && npm install && npm run setup

# Frontend
cd ../front/frontend && npm install

# Backend
cd ../backend && pip install -r requirements.txt
cp .env.example .env  # Fill in OPENAI_API_KEY and MCP_API_KEY
```

### 3. First Build & Test
```bash
cd on-premise && npm run build && npm test    # 10/10 tests
cd ../front/backend && pytest                  # 3/3 tests
cd ../frontend && npm run build                # 0 errors
```

### 4. Connect Claude Code to MCP
```bash
claude mcp add mal-mcp-hub -s project \
  -e TRANSPORT=stdio \
  -e SQLITE_PATH=./data/catalog.db \
  -e ASSETS_PATH=./data/assets \
  -- node on-premise/dist/index.js
```

### 5. Register Yourself as Team Member
In Claude Code:
> "Register me as a team member: id=your-name, name=Your Full Name, email=your@email.com, role=developer"

This creates your profile for gamification and contribution tracking.

## Day 2: Team Conventions
- Read CLAUDE.md (root) thoroughly
- Read front/CLAUDE.md for frontend/backend conventions
- Understand the tool naming convention: `mal_{action}_{resource}`
- Review branch naming: `feature/mal-xxx-description`
- Use conventional commits: `feat:`, `fix:`, `docs:`

## Key Contacts
- Repo structure questions → CLAUDE.md
- MCP tool questions → Use `mal_search_catalog`
- Sprint questions → Use `mal_get_sprint`
- Stuck on something → Log an interaction, the team can search it later
