# GitHub Repo Integration for Analytics

## Overview

Connect GitHub repositories to the MCP Hub for commit-based analytics and per-project leaderboards. Each project stores a `repo_url` in its metadata. The backend clones/pulls repos to a local cache, analyzes commits on the `dev` branch, and syncs contributions to the leaderboard.

## Architecture

```
Project (metadata.repo_url)
    │
    ▼
Backend (_ensure_repo)           MCP Server
    │                                │
    ├── git clone/pull ──► /tmp/     │
    │   mal-repo-cache/              │
    │   org-repo/                    │
    │                                │
    ├── mal_get_commit_activity ────►│
    │   (repo_path, project_id)      │
    │                                ├── git log --numstat
    │                                ├── Match authors → team_members
    │                                ├── Dedup by SHA
    │                                ├── Log contributions (with project_id)
    │                                └── Update XP/level/streak
    │                                │
    ├── mal_get_leaderboard ────────►│
    │   (project_id)                 │
    │                                ├── Filter contributions by project_id
    │                                └── Rank by XP
    │                                │
    ▼                                ▼
Frontend (LeaderboardPage)
    ├── Sync Commits button
    ├── Repo info bar (source + branch)
    └── Per-project or global rankings
```

## Clone/Pull Caching

```python
REPO_CACHE_DIR = Path("/tmp/mal-repo-cache")

def _ensure_repo(repo_url: str, branch: str = "dev") -> str:
    REPO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    clean = repo_url.replace("https://github.com/", "").split("/tree/")[0]
    folder_name = clean.replace("/", "-")
    local_path = REPO_CACHE_DIR / folder_name
    clone_url = repo_url.split("/tree/")[0]
    if not clone_url.endswith(".git"):
        clone_url += ".git"

    if (local_path / ".git").exists():
        subprocess.run(["git", "-C", str(local_path), "fetch", "--all"],
                       capture_output=True, timeout=30)
        subprocess.run(["git", "-C", str(local_path), "checkout", branch],
                       capture_output=True, timeout=10)
        subprocess.run(["git", "-C", str(local_path), "pull", "origin", branch],
                       capture_output=True, timeout=30)
    else:
        subprocess.run(["git", "clone", "--branch", branch, clone_url, str(local_path)],
                       capture_output=True, timeout=60)
    return str(local_path)
```

## Git Author → Team Member Matching

The MCP tool `mal_get_commit_activity` matches git authors to registered team members:

1. **By email**: Exact match on `team_members.email` field
2. **By name prefix**: First word of git author name matches team member name (case-insensitive)

```typescript
// Match by email first
let member = members.find(m => m.email === commit.authorEmail);
// Fallback to name prefix
if (!member) {
    const firstName = commit.author.split(" ")[0].toLowerCase();
    member = members.find(m => m.name.toLowerCase().startsWith(firstName));
}
```

## Contribution Dedup

Commits are deduped by SHA hash. Calling `mal_get_commit_activity` multiple times is safe:

```typescript
// Check if contribution already exists
const existing = await db.list("contributions", {
    filters: { reference_id: commit.hash, type: "commit" },
});
if (existing.items.length > 0) continue; // Skip duplicate
```

## XP Formula

- **Base**: 10 XP per commit
- **Lines bonus**: +1 XP per 100 lines changed
- **Cap**: 50 XP per commit
- **Streak**: consecutive contribution days tracked on team member profile

## Project Metadata

```typescript
// Create project with repo URL
await createProject({
    id: "bella-italia",
    name: "Bella Italia",
    status: "active",
    color: "green",
    metadata: { repo_url: "https://github.com/org/repo/tree/dev" }
});
```

## Frontend Integration

```tsx
// LeaderboardPage.tsx
const repoUrl = activeProject?.metadata?.repo_url ?? DEFAULT_REPO_URL;

const handleSync = async () => {
    await fetchCommitActivity(90, repoUrl, activeProjectId);
    toast.success("Commits synced — leaderboard updated");
    refetch();
};
```

## Key Rules

1. **Always use `dev` branch** — The leaderboard is always based on the dev branch
2. **Show a note**: Display `* Rankings are always based on the dev branch` in the UI
3. **Global vs project**: No project filter → global rankings from default repo. With project → per-project rankings from project's repo
4. **Cache location**: `/tmp/mal-repo-cache/` — volatile, re-clones after system restart
