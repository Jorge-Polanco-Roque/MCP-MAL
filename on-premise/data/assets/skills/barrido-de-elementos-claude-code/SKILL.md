# Barrido de Elementos Claude Code

Analyze any project's tech stack and recommend the most relevant skills, subagents, and MCPs from the MAL catalog. Write results to the project's CLAUDE.md.

## When to Use

- Onboarding a new project into the MAL ecosystem
- After importing new catalog entries (Composio skills, VoltAgent subagents)
- When a project's stack changes significantly (new language, framework, or infra)
- Periodic review to discover newly available catalog items

## The Process

### Phase 1: Project Discovery

Read the project to build a tech profile. Check these files (skip any that don't exist):

| File | What to Extract |
|------|----------------|
| `CLAUDE.md` | Existing conventions, architecture, tools in use |
| `package.json` / `package-lock.json` | Node.js deps, scripts, framework (React, Next.js, Express, etc.) |
| `pyproject.toml` / `requirements.txt` | Python deps, framework (FastAPI, Django, Flask, etc.) |
| `Cargo.toml` | Rust crates |
| `go.mod` | Go modules |
| `pom.xml` / `build.gradle` | Java/Kotlin deps |
| `Gemfile` | Ruby gems |
| `composer.json` | PHP deps |
| `*.csproj` / `*.sln` | .NET projects |
| `Dockerfile` / `docker-compose.yml` | Container setup, services, infra |
| `terraform/` / `*.tf` | IaC provider (AWS, GCP, Azure) |
| `.github/workflows/` / `cloudbuild.yaml` / `Jenkinsfile` | CI/CD platform |
| `tsconfig.json` | TypeScript config |
| `.env.example` / `.env` | Environment variables (services, APIs, SaaS) |
| `src/` structure | Architecture patterns (monolith, microservices, monorepo) |

Build a **Tech Profile** with:
- **Languages**: TypeScript, Python, Go, Rust, etc.
- **Frameworks**: React, Next.js, FastAPI, Express, Django, etc.
- **Databases**: SQLite, PostgreSQL, Firestore, MongoDB, Redis, etc.
- **Infrastructure**: Docker, Kubernetes, Terraform, Cloud Run, Lambda, etc.
- **CI/CD**: GitHub Actions, Cloud Build, CircleCI, Jenkins, etc.
- **SaaS integrations**: Slack, GitHub, Jira, Stripe, etc. (from .env, imports, configs)
- **Testing**: vitest, pytest, jest, mocha, etc.
- **Architecture**: monolith, microservices, MCP server, LangGraph agents, etc.

### Phase 2: Catalog Fetch

Fetch the **entire** catalog using MCP tools. Paginate until `has_more === false`.

```
# Skills (140+)
mal_list_skills({ limit: 100, offset: 0 })
mal_list_skills({ limit: 100, offset: 100 })
... until has_more === false

# Subagents (135+)
mal_list_subagents({ limit: 100, offset: 0 })
mal_list_subagents({ limit: 100, offset: 100 })
... until has_more === false

# MCPs (6)
mal_list_mcps({ limit: 100 })
```

For each item, collect: `id`, `name`, `description`, `tags`.

### Phase 3: Intelligent Matching

Classify every catalog item into one of three tiers:

| Tier | Criteria | Example |
|------|----------|---------|
| **HIGH** | Direct stack match. The project uses this technology/tool/service. | `react-patterns` for a React project, `postgres-pro` subagent for a PostgreSQL project |
| **MEDIUM** | Methodology or workflow skill applicable to any project, OR tangentially related technology. | `test-driven-development`, `kaizen`, `brainstorming`, `git-workflow-manager` |
| **SKIP** | Unrelated technology, language, or service not used by the project. | `laravel-specialist` for a Python project, `salesforce-automation` for a project without Salesforce |

#### Matching Rules

**Skills:**
1. **SaaS automation skills** (tagged `saas-automation` or `composio`): SKIP unless the specific SaaS is detected in the project (e.g., `slack-automation` only if Slack integration found in .env or imports). When matched, classify as HIGH.
2. **Language/framework skills**: HIGH if the project uses that language/framework. SKIP otherwise.
3. **Methodology skills** (`test-driven-development`, `kaizen`, `brainstorming`, `subagent-driven-development`, `root-cause-tracing`, `prompt-engineering`, `software-architecture`, `changelog-generator`): Always MEDIUM.
4. **Onboarding/workflow skills** (`team-onboarding`, `git-workflow-mal`, `code-review-checklist`, `technical-writing`, `sprint-planning-guide`): Always MEDIUM.
5. **Document skills** (`pdf`, `docx`, `pptx`, `xlsx`): MEDIUM (generally useful). HIGH if the project processes documents.

**Subagents:**
1. **Language-specific subagents** (`python-pro`, `typescript-pro`, `rust-engineer`, `golang-pro`, etc.): HIGH only if the project uses that language. SKIP otherwise.
2. **Infrastructure subagents** (`terraform-engineer`, `kubernetes-specialist`, `devops-engineer`, `cloud-architect`): HIGH if the project uses that infra. SKIP otherwise.
3. **Universal subagents** (`debugger`, `refactoring-specialist`, `performance-engineer`, `security-auditor`, `git-workflow-manager`, `documentation-engineer`, `test-automator`): Always MEDIUM.
4. **Role subagents** (`scrum-master`, `product-manager`, `project-manager`): MEDIUM (team workflow).
5. **Framework-specific subagents** (`react-specialist`, `nextjs-developer`, `django-developer`, `laravel-specialist`): HIGH only if the project uses that framework. SKIP otherwise.

**MCPs:**
1. `context7`: Always HIGH (documentation lookup is universally useful).
2. `github`: HIGH if project uses GitHub. MEDIUM otherwise (most projects use git).
3. `playwright`: HIGH if project has a web frontend or needs E2E testing. MEDIUM otherwise.
4. `memory`: MEDIUM (useful for any long-running project).
5. `sequential-thinking`: MEDIUM (useful for complex reasoning tasks).
6. `brave-search`: MEDIUM (web search for research).

#### Target Counts

| Collection | Target | Range |
|------------|--------|-------|
| Skills | 10-25 | Only HIGH + MEDIUM |
| Subagents | 8-15 | Only HIGH + MEDIUM |
| MCPs | 2-4 | Only HIGH + MEDIUM |
| **Total** | **20-44** | |

If you have too many MEDIUM items, prioritize those most relevant to the project type.

### Phase 4: Write to CLAUDE.md

Append (or replace if already present) a `## MAL Catalog — Recommended Elements` section at the end of the project's CLAUDE.md.

#### Output Format

```markdown
## MAL Catalog — Recommended Elements

> Auto-generated by `barrido-de-elementos-claude-code` on YYYY-MM-DD.
> Re-run the barrido to refresh after catalog updates.

### Tech Stack Detected

- **Languages**: TypeScript, Python
- **Frameworks**: React, FastAPI, LangGraph
- **Databases**: SQLite, Firestore
- **Infrastructure**: Docker, GCP Cloud Run, Terraform
- **CI/CD**: Cloud Build
- **Testing**: vitest, pytest

### Recommended Skills (N items)

| Skill | Relevance | Why |
|-------|-----------|-----|
| `react-patterns` | HIGH | React frontend detected in front/frontend/ |
| `mcp-tool-development` | HIGH | Project is an MCP server (51 tools) |
| `sqlite-patterns` | HIGH | SQLite used in on-premise/ |
| `test-driven-development` | MEDIUM | Universal methodology — vitest + pytest in use |
| `kaizen` | MEDIUM | Continuous improvement methodology |
| ... | | |

### Recommended Subagents (N items)

| Subagent | Relevance | Why |
|----------|-----------|-----|
| `typescript-pro` | HIGH | Primary language for MCP server |
| `python-pro` | HIGH | Backend agent code in front/backend/ |
| `terraform-engineer` | HIGH | nube/terraform/ infrastructure |
| `debugger` | MEDIUM | Universal debugging assistant |
| `security-auditor` | MEDIUM | OWASP + auth hardening patterns |
| ... | | |

### Recommended MCPs (N items)

| MCP | Relevance | Why |
|-----|-----------|-----|
| `context7` | HIGH | Documentation lookup for 20+ libraries |
| `github` | HIGH | GitHub repository detected |
| `playwright` | HIGH | Web frontend — E2E testing |
| `memory` | MEDIUM | Persistent knowledge graph across sessions |
```

#### Writing Rules

1. If `## MAL Catalog — Recommended Elements` already exists in CLAUDE.md, replace the entire section (from that heading to the next `## ` heading or end of file).
2. If it doesn't exist, append it at the end of the file.
3. Sort items within each table: HIGH first, then MEDIUM.
4. The "Why" column must reference specific evidence from Phase 1 (file names, dependencies, configs found).
5. Include the generation date for freshness tracking.

## Important Notes

- **Never fabricate evidence.** Only mark a technology as detected if you actually found it in project files.
- **Pagination is mandatory.** The catalog has 140+ skills and 135+ subagents. A single `mal_list_skills()` call with default limit (20) will miss most items. Always paginate with `limit: 100` until `has_more === false`.
- **Read before writing.** Always read the existing CLAUDE.md before modifying it to preserve all existing content.
- **Be conservative with HIGH.** A skill/subagent should only be HIGH if there's clear evidence the project uses that specific technology. When in doubt, use MEDIUM or SKIP.
- **SaaS skills require evidence.** Don't recommend `slack-automation` just because "most teams use Slack." Only recommend it if Slack tokens, webhooks, or SDK imports are found in the project.