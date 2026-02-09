# Git Activity Report

> Git log stats for a period: commits per author, files changed, insertions/deletions. Outputs markdown table.

- **Category**: git
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: git, analytics, report

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `repo_path` | string | no | `.` | Path to git repository |
| `days` | number | no | `7` | Number of days to look back |

## Script

```bash
#!/bin/bash
cd "{{repo_path}}"
DAYS={{days}}
SINCE=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "$DAYS days ago" +%Y-%m-%d)
echo "## Git Activity Report (last $DAYS days)"
echo ""
echo "| Author | Commits | Files Changed | Insertions | Deletions |"
echo "|--------|---------|---------------|------------|-----------|"
git log --since="$SINCE" --format="%an" --shortstat | awk '
  /^[A-Za-z]/ { author=$0; next }
  /files? changed/ {
    files=0; ins=0; del=0
    for(i=1;i<=NF;i++) {
      if($(i+1) ~ /files?/) files=$i
      if($(i+1) ~ /insertion/) ins=$i
      if($(i+1) ~ /deletion/) del=$i
    }
    commits[author]++
    total_files[author]+=files
    total_ins[author]+=ins
    total_del[author]+=del
  }
  END {
    for(a in commits)
      printf "| %s | %d | %d | +%d | -%d |\n", a, commits[a], total_files[a], total_ins[a], total_del[a]
  }
'
```
