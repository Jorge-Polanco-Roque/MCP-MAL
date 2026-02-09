# MAL Git Workflow

## Overview
Git workflow conventions for the MAL platform team.

## Branch Naming
```
feature/mal-001-description    # New feature
fix/mal-002-description        # Bug fix
docs/mal-003-description       # Documentation
infra/mal-004-description      # Infrastructure/DevOps
```

## Conventional Commits
```
feat: add gamification leaderboard endpoint
fix: correct XP calculation for streak multiplier
docs: update CLAUDE.md with Phase 5 roadmap
infra: add Terraform monitoring alerts
refactor: extract pagination utility
test: add sprint reporter agent tests
chore: upgrade dependencies
```

Format: `<type>: <description>`
- Keep subject line under 72 characters
- Use imperative mood ("add" not "added")
- Body optional, separated by blank line

## Pull Request Process
1. Create branch from `dev`
2. Make changes, commit with conventional commits
3. Push and create PR
4. PR title = conventional commit format
5. PR body: Summary + Test Plan
6. Get 1+ approval
7. Squash merge into `dev`

## Merge Strategy
- `dev` ← squash merge from feature branches
- `main` ← merge commit from `dev` (release)
- Never force push to `dev` or `main`

## Release Flow
1. Create `release/vX.Y.Z` branch from `dev`
2. Final testing and fixes
3. Merge to `main` + tag
4. Merge back to `dev`

## Hotfix Process
1. Branch from `main`: `fix/hotfix-description`
2. Fix and test
3. Merge to `main` + `dev`
4. Tag patch version
