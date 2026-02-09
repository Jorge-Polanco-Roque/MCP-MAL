# GitHub MCP

> Full GitHub integration: repos, issues, PRs, code search, actions, commits, branches, releases, security alerts, organizations, and more. 51 tools for complete GitHub workflow automation. Requires GITHUB_TOKEN.

- **Transport**: stdio
- **Command**: `docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server`
- **Author**: GitHub
- **Status**: active

## Tools Exposed

- `create_or_update_file` — Create or update a file in a repository
- `search_repositories` — Search for repositories
- `create_repository` — Create a new repository
- `get_file_contents` — Get file contents from a repository
- `push_files` — Push multiple files to a repository
- `create_issue` — Create an issue
- `create_pull_request` — Create a pull request
- `fork_repository` — Fork a repository
- `create_branch` — Create a branch
- `list_commits` — List commits
- `list_issues` — List issues
- `update_issue` — Update an issue
- `add_issue_comment` — Add a comment to an issue
- `search_code` — Search code across repositories
- `search_issues` — Search issues
- `search_users` — Search users
- `get_issue` — Get issue details
- `get_pull_request` — Get pull request details
- `list_pull_requests` — List pull requests
- `create_release` — Create a release

## Configuration

Requires `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable with appropriate scopes.

```json
{
  "command": "docker",
  "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>"
  }
}
```

Alternatively, use the HTTP endpoint: `https://api.githubcopilot.com/mcp/`
