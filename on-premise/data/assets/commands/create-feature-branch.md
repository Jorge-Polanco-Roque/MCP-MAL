# Create Feature Branch

> Creates a feature/mal-{id}-{description} branch from latest dev. Follows MAL naming conventions.

- **Category**: git
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: git, branch, workflow

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `repo_path` | string | no | `.` | Path to git repository |
| `id` | string | yes | — | Issue/feature ID (e.g., 042) |
| `description` | string | yes | — | Short description in kebab-case |

## Script

```bash
#!/bin/bash
set -e
cd "{{repo_path}}"
BRANCH="feature/mal-{{id}}-{{description}}"
echo "Creating branch: $BRANCH"
git fetch origin
git checkout -b "$BRANCH" origin/dev 2>/dev/null || git checkout -b "$BRANCH"
echo "Branch '$BRANCH' created and checked out."
```
