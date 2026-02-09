# Pretty Git Log

> Shows git log with oneline graph, decorations, and color. Configurable number of entries.

- **Category**: git
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: git, log, visualization

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `repo_path` | string | no | `.` | Path to git repository |
| `count` | number | no | `20` | Number of commits to show |

## Script

```bash
git -C "{{repo_path}}" log --oneline --graph --decorate --all --color -n {{count}}
```
