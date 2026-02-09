# Technical Writing Standards

## Overview
Documentation standards for the MAL platform. Covers CLAUDE.md, README, API docs, and architecture diagrams.

## CLAUDE.md Structure
The CLAUDE.md file is the primary documentation for Claude Code. Structure:

1. **Project Overview** — What it is, tech stack, high-level purpose
2. **Repository Structure** — File tree with annotations
3. **Build & Dev Commands** — How to build, test, run
4. **Architecture** — Diagrams (ASCII), data flow, key abstractions
5. **Tool/API Map** — Complete reference of all tools/endpoints
6. **Data Model** — Tables/collections with field descriptions
7. **Configuration** — Env vars, connection strings, feature flags
8. **Conventions** — Code style, naming, commit messages
9. **Test Status** — Which tests exist, what they cover
10. **Known Issues** — Gotchas, workarounds, fixed bugs

## ASCII Architecture Diagrams
```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───►│ Backend  │───►│ Database │
│ React    │    │ FastAPI  │    │ SQLite   │
└──────────┘    └──────────┘    └──────────┘
```
Use box-drawing characters: `┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼ ► ▼`

## README Conventions
- Start with project name + one-line description
- Include badges (build status, version, license)
- Quick start in < 5 steps
- Link to detailed docs (CLAUDE.md)

## API Documentation
- Describe each endpoint: method, path, params, response
- Include curl examples
- Document error responses
- Use tables for parameter lists

## Inline Comments
- Comment the WHY, not the WHAT
- Don't comment obvious code
- Use TODO/FIXME/HACK tags consistently
- Reference issue IDs when relevant

## Decision Records (ADR)
Format: Title, Status, Context, Decision, Consequences
Keep in `docs/decisions/` directory.
