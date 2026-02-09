# Clean Merged Branches

> List and delete local branches already merged into dev/main. Protects main, master, and dev branches.

- **Category**: git
- **Shell**: bash
- **Requires Confirmation**: yes
- **Author**: MAL Team
- **Tags**: git, cleanup, branches

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `repo_path` | string | no | `.` | Path to git repository |

## Script

```bash
#!/bin/bash
cd "{{repo_path}}"
echo "Branches merged into current branch:"
MERGED=$(git branch --merged | grep -vE '(main|master|dev|develop|\*)' || true)
if [ -z "$MERGED" ]; then
  echo "  No merged branches to clean."
  exit 0
fi
echo "$MERGED"
echo ""
echo "Deleting..."
echo "$MERGED" | xargs git branch -d
echo "Done."
```
