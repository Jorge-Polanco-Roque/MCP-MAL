# Changelog Generator

Generate structured changelogs from git commit history. Analyzes commits, categorizes changes, and produces user-friendly release notes.

## When to Use

- Before a release or deployment
- At sprint end for sprint summaries
- For pull request descriptions
- To document what changed between two points in time

## Process

### 1. Gather Commits

```bash
# Between two tags
git log v1.2.0..v1.3.0 --oneline --no-merges

# Between two dates
git log --after="2026-02-01" --before="2026-02-09" --oneline --no-merges

# Between two branches
git log main..dev --oneline --no-merges
```

### 2. Categorize by Conventional Commits

Parse the commit prefix to categorize:

| Prefix | Category | Display |
|--------|----------|---------|
| `feat:` | Features | New Features |
| `fix:` | Bug Fixes | Bug Fixes |
| `docs:` | Documentation | Documentation |
| `infra:` | Infrastructure | Infrastructure |
| `refactor:` | Refactoring | Code Improvements |
| `test:` | Testing | Tests |
| `perf:` | Performance | Performance |
| `style:` | Style | Style Changes |

### 3. Format Output

```markdown
# Changelog — v1.3.0

**Release Date:** 2026-02-09
**Commits:** 24 | **Contributors:** 3

## New Features
- Add project management with 5 MCP tools (create/list/get/update/delete)
- Add chat-first architecture with human-in-the-loop confirmation
- Add dark mode with class strategy and useTheme hook

## Bug Fixes
- Fix command injection in analytics.ts (use execFileSync)
- Fix timing-unsafe auth in on-premise (use timingSafeEqual)
- Fix FTS auto-sync on CRUD operations

## Infrastructure
- Add audit logging with withAudit() HOF wrapper
- Add persistent chat memory with AsyncSqliteSaver
- Auto-seed catalog on npm run setup

## Documentation
- Export catalog assets to repo for GitHub browsability
- Update CLAUDE.md with all 62 known fixes
```

## MAL Integration

### Using MCP Tools

Use `mal_get_commit_activity` to get structured commit data:

```
Tool: mal_get_commit_activity
Args: { "days": 14, "project_id": "mal-mcp-hub" }
```

This returns daily commit counts, per-author stats, and file change metrics that can feed into changelog generation.

### Sprint-Based Changelogs

Combine sprint data with git history:

```
1. mal_get_sprint → get sprint dates and goal
2. mal_get_commit_activity → get commits in date range
3. mal_list_work_items → get completed work items
4. Format into changelog with sprint context
```

## Automation Script

```bash
#!/bin/bash
# Generate changelog between two refs
FROM=${1:-$(git describe --tags --abbrev=0)}
TO=${2:-HEAD}

echo "# Changelog — $FROM..$TO"
echo ""
echo "**Date:** $(date +%Y-%m-%d)"
echo ""

for prefix in "feat" "fix" "docs" "infra" "refactor" "test"; do
  commits=$(git log "$FROM..$TO" --oneline --no-merges --grep="^$prefix:" | sed "s/^[a-f0-9]* /- /")
  if [ -n "$commits" ]; then
    case $prefix in
      feat) echo "## New Features" ;;
      fix) echo "## Bug Fixes" ;;
      docs) echo "## Documentation" ;;
      infra) echo "## Infrastructure" ;;
      refactor) echo "## Code Improvements" ;;
      test) echo "## Tests" ;;
    esac
    echo "$commits"
    echo ""
  fi
done
```

## Best Practices

- **User-facing language**: Write for humans, not developers. "Add dark mode" not "impl theme ctx provider"
- **Group logically**: Features > Fixes > Docs > Infrastructure
- **Include metrics**: Commit count, contributor count, lines changed
- **Link to PRs/issues**: Reference tickets when available
- **Highlight breaking changes**: Call out anything that requires user action
