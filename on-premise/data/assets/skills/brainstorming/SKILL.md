# Brainstorming Ideas Into Designs

Turn ideas into fully formed designs and specs through collaborative dialogue. Understand context, ask questions, explore approaches, and present validated designs.

Adapted from [obra/superpowers](https://github.com/obra/superpowers).

## When to Use

- Creating new features, building components, adding functionality
- Before any creative work that modifies behavior
- When requirements are unclear and need exploration
- Feature planning sessions

## The Process

### Phase 1: Understanding the Idea

1. Check out the current project state (files, docs, recent commits)
2. Ask questions **one at a time** to refine the idea
3. Prefer multiple choice questions when possible
4. Focus on: purpose, constraints, success criteria

### Phase 2: Exploring Approaches

1. Propose 2-3 different approaches with trade-offs
2. Lead with your recommended option and explain why
3. Present options conversationally

### Phase 3: Presenting the Design

1. Break design into sections of 200-300 words
2. Ask after each section whether it looks right
3. Cover: architecture, components, data flow, error handling, testing
4. Be ready to go back and clarify

### Phase 4: Documentation

1. Write validated design to a plan file
2. Commit the design document

## MAL Integration

### Using MCP Tools for Context

Before brainstorming, gather context from the platform:

```
mal_list_work_items → understand current backlog and priorities
mal_get_sprint → know the current sprint goal and timeline
mal_search_interactions → find past discussions about the topic
mal_search_catalog → find relevant skills and patterns
```

### Design Document Format

```markdown
# Design: [Feature Name]

**Date:** 2026-02-09
**Author:** [name]
**Status:** Draft / Approved / Implemented

## Problem
What problem does this solve? Why now?

## Approach
Which approach was chosen and why.

## Architecture
- Components involved
- Data flow
- New MCP tools (if any)

## Trade-offs
What was considered but rejected, and why.

## Implementation Plan
Step-by-step tasks (feed into sprint work items).
```

### Creating Work Items from Designs

After brainstorming produces a design, convert it to work items:

```
mal_create_work_item → create epic for the feature
mal_create_work_item → create tasks for each implementation step
mal_update_work_item → assign to sprint and team members
```

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present design in sections, validate each
- **Be flexible** — Go back and clarify when something doesn't make sense

## Example: New MCP Tool Design

**Idea:** "We need a tool to bulk update work items"

**Understanding:**
- Q: "What fields should be updatable in bulk?" → status, priority, sprint_id, assignee, labels
- Q: "What's the max batch size?" → 50 items per call
- Q: "Should it support mixed updates (different fields per item)?" → Yes

**Approaches:**
1. Single tool with array of `{id, updates}` objects (recommended — flexible, one call)
2. Batch endpoint per field (simpler, but requires multiple calls)
3. SQL-like WHERE clause (powerful, but complex and risky)

**Design:**
```typescript
server.registerTool("mal_bulk_update_work_items", {
  inputSchema: {
    updates: z.array(z.object({
      id: z.string(),
      status: z.string().optional(),
      priority: z.string().optional(),
      sprint_id: z.string().optional(),
      assignee: z.string().optional(),
      labels: z.array(z.string()).optional(),
    })).max(50),
  },
});
```

**Result:** This exact design was implemented in MAL as `mal_bulk_update_work_items`.
