import Database from "better-sqlite3";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";

const DB_PATH = process.env.SQLITE_PATH || "./data/catalog.db";
const ASSETS_PATH = process.env.ASSETS_PATH || "./data/assets";

// ============================================================
// 1. EXTERNAL MCPs (6)
// ============================================================

const mcps = [
  {
    id: "context7",
    name: "Context7",
    description:
      "Up-to-date library documentation lookup via MCP. Resolves library IDs and queries current docs/code examples. Eliminates stale LLM knowledge for any npm, PyPI, or Cargo package.",
    transport: "streamable-http",
    endpoint_url: "https://mcp.context7.com/mcp",
    command: null,
    args: JSON.stringify([]),
    env_vars: JSON.stringify({}),
    health_check_url: null,
    status: "active",
    tools_exposed: JSON.stringify(["resolve-library-id", "query-docs"]),
    author: "Upstash",
  },
  {
    id: "playwright",
    name: "Playwright MCP",
    description:
      "Browser automation by Microsoft. Navigate, click, type, screenshot, fill forms, handle dialogs, generate PDFs, accessibility snapshots. Supports Chromium, Firefox, WebKit. Use --headless for CI, --vision for coordinate-based interactions.",
    transport: "stdio",
    endpoint_url: null,
    command: "npx",
    args: JSON.stringify(["@playwright/mcp@latest", "--headless"]),
    env_vars: JSON.stringify({}),
    health_check_url: null,
    status: "active",
    tools_exposed: JSON.stringify([
      "browser_navigate",
      "browser_click",
      "browser_type",
      "browser_snapshot",
      "browser_take_screenshot",
      "browser_evaluate",
      "browser_pdf_save",
      "browser_tab_list",
      "browser_tab_new",
      "browser_tab_close",
      "browser_select_option",
      "browser_hover",
      "browser_drag",
      "browser_press_key",
      "browser_file_upload",
      "browser_handle_dialog",
      "browser_network_requests",
      "browser_console_messages",
      "browser_resize",
      "browser_wait_for",
    ]),
    author: "Microsoft",
  },
  {
    id: "github",
    name: "GitHub MCP",
    description:
      "Full GitHub integration: repos, issues, PRs, code search, actions, commits, branches, releases, security alerts, organizations, and more. 51 tools for complete GitHub workflow automation. Requires GITHUB_TOKEN.",
    transport: "stdio",
    endpoint_url: null,
    command: "docker",
    args: JSON.stringify([
      "run",
      "-i",
      "--rm",
      "-e",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "ghcr.io/github/github-mcp-server",
    ]),
    env_vars: JSON.stringify({ GITHUB_PERSONAL_ACCESS_TOKEN: "" }),
    health_check_url: null,
    status: "active",
    tools_exposed: JSON.stringify([
      "create_or_update_file",
      "search_repositories",
      "create_repository",
      "get_file_contents",
      "push_files",
      "create_issue",
      "create_pull_request",
      "fork_repository",
      "create_branch",
      "list_commits",
      "list_issues",
      "update_issue",
      "add_issue_comment",
      "search_code",
      "search_issues",
      "search_users",
      "get_issue",
      "get_pull_request",
      "list_pull_requests",
      "create_release",
    ]),
    author: "GitHub",
  },
  {
    id: "memory",
    name: "Memory (Knowledge Graph)",
    description:
      "Persistent knowledge graph across sessions. Create entities with observations, define relations between them, search/query the graph. Stores data in a local JSONL file. Ideal for maintaining context across conversations and building institutional memory.",
    transport: "stdio",
    endpoint_url: null,
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-memory"]),
    env_vars: JSON.stringify({}),
    health_check_url: null,
    status: "active",
    tools_exposed: JSON.stringify([
      "create_entities",
      "create_relations",
      "add_observations",
      "delete_entities",
      "delete_observations",
      "delete_relations",
      "read_graph",
      "search_nodes",
      "open_nodes",
    ]),
    author: "Anthropic",
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    description:
      "Structured multi-step reasoning tool. Supports dynamic thought chains with revision, branching, and hypothesis testing. Ideal for complex problem decomposition, planning, and analysis where step-by-step reasoning improves outcomes.",
    transport: "stdio",
    endpoint_url: null,
    command: "npx",
    args: JSON.stringify([
      "-y",
      "@modelcontextprotocol/server-sequential-thinking",
    ]),
    env_vars: JSON.stringify({}),
    health_check_url: null,
    status: "active",
    tools_exposed: JSON.stringify(["sequentialthinking"]),
    author: "Anthropic",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description:
      "Web, local, video, image, and news search with AI summaries. Privacy-focused alternative to Google search. Free tier available (1 req/sec, 2000/month). Includes local POI search with ratings and reviews. Requires BRAVE_API_KEY.",
    transport: "stdio",
    endpoint_url: null,
    command: "npx",
    args: JSON.stringify(["-y", "@brave/brave-search-mcp-server"]),
    env_vars: JSON.stringify({ BRAVE_API_KEY: "" }),
    health_check_url: null,
    status: "active",
    tools_exposed: JSON.stringify([
      "brave_web_search",
      "brave_local_search",
      "brave_news_search",
      "brave_image_search",
      "brave_video_search",
      "brave_summarize",
    ]),
    author: "Brave Software",
  },
];

// ============================================================
// 2. SKILLS (22) with SKILL.md content
// ============================================================

const skills = [
  // --- devops (3) ---
  {
    id: "docker-compose-patterns",
    name: "Docker Compose Patterns",
    description:
      "Multi-service orchestration patterns, networking, volumes, health checks, dev vs prod configs. Includes MAL-specific examples (MCP + backend + frontend).",
    version: "1.0.0",
    category: "devops",
    trigger_patterns: JSON.stringify([
      "docker compose",
      "multi-service",
      "container orchestration",
    ]),
    asset_path: "skills/docker-compose-patterns/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["docker", "compose", "orchestration", "devops"]),
    skill_md: `# Docker Compose Patterns

## Overview
Multi-service orchestration patterns for local development and production deployment. Covers networking, volumes, health checks, and environment-specific configurations.

## Core Patterns

### 1. Service Dependencies
\`\`\`yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
\`\`\`

### 2. Health Checks
\`\`\`yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
\`\`\`

### 3. Networking
- Use custom bridge networks for service isolation
- Name networks explicitly for clarity
- Use \`expose\` for internal ports, \`ports\` only for host-facing

\`\`\`yaml
networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
\`\`\`

### 4. Volume Patterns
\`\`\`yaml
volumes:
  db-data:         # Named volume for persistence
  node_modules:    # Anonymous volume for node_modules

services:
  app:
    volumes:
      - ./src:/app/src        # Bind mount for hot reload
      - node_modules:/app/node_modules  # Preserve container node_modules
      - db-data:/data          # Persistent database
\`\`\`

### 5. Dev vs Prod
Use \`docker-compose.override.yml\` for dev, base \`docker-compose.yml\` for prod:
\`\`\`bash
# Dev (auto-loads override)
docker compose up

# Prod (explicit file)
docker compose -f docker-compose.yml up -d
\`\`\`

### 6. MAL Stack Example
\`\`\`yaml
services:
  mcp-server:
    build: ./on-premise
    ports: ["3000:3000"]
    environment:
      TRANSPORT: http
      SQLITE_PATH: /data/catalog.db
    volumes:
      - mcp-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]

  backend:
    build: ./front/backend
    ports: ["8000:8000"]
    environment:
      MCP_SERVER_URL: http://mcp-server:3000/mcp
    depends_on:
      mcp-server:
        condition: service_healthy

  frontend:
    build: ./front/frontend
    ports: ["80:80"]
    depends_on: [backend]
\`\`\`

## Best Practices
- Always use explicit image tags (never \`latest\` in prod)
- Set resource limits: \`deploy.resources.limits\`
- Use \`.env\` file for environment variables
- Add \`restart: unless-stopped\` for production services
- Log to stdout/stderr, collect with Docker logging driver
`,
  },
  {
    id: "gcp-cloud-run-deploy",
    name: "GCP Cloud Run Deployment",
    description:
      "Step-by-step Cloud Run deployment: Dockerfile, cloudbuild.yaml, IAM, VPC connector, env vars, secrets, traffic splitting, rollback.",
    version: "1.0.0",
    category: "devops",
    trigger_patterns: JSON.stringify([
      "cloud run",
      "gcp deploy",
      "deploy to cloud",
    ]),
    asset_path: "skills/gcp-cloud-run-deploy/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["gcp", "cloud-run", "deploy", "devops"]),
    skill_md: `# GCP Cloud Run Deployment

## Overview
Complete guide for deploying containerized applications to Google Cloud Run. Covers Dockerfile best practices, CI/CD with Cloud Build, IAM setup, networking, and operational patterns.

## Prerequisites
- GCP project with billing enabled
- \`gcloud\` CLI authenticated
- APIs enabled: Cloud Run, Cloud Build, Artifact Registry

## Step 1: Dockerfile (Multi-stage)
\`\`\`dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim
RUN addgroup --system app && adduser --system --ingroup app app
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
\`\`\`

## Step 2: Cloud Build (cloudbuild.yaml)
\`\`\`yaml
steps:
  - name: node:20
    entrypoint: npm
    args: ['ci']
  - name: node:20
    entrypoint: npm
    args: ['run', 'build']
  - name: node:20
    entrypoint: npm
    args: ['test']
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', '\${_REGION}-docker.pkg.dev/\${PROJECT_ID}/\${_REPO}/\${_SERVICE}:\${SHORT_SHA}', '.']
  - name: gcr.io/cloud-builders/docker
    args: ['push', '\${_REGION}-docker.pkg.dev/\${PROJECT_ID}/\${_REPO}/\${_SERVICE}:\${SHORT_SHA}']
  - name: gcr.io/cloud-builders/gcloud
    args: ['run', 'deploy', '\${_SERVICE}', '--image', '\${_REGION}-docker.pkg.dev/\${PROJECT_ID}/\${_REPO}/\${_SERVICE}:\${SHORT_SHA}', '--region', '\${_REGION}']
\`\`\`

## Step 3: IAM Setup
\`\`\`bash
# Create service account
gcloud iam service-accounts create my-service-sa

# Grant roles
gcloud projects add-iam-policy-binding PROJECT_ID \\
  --member="serviceAccount:my-service-sa@PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/datastore.user"
\`\`\`

## Step 4: Environment Variables & Secrets
\`\`\`bash
# Set env vars
gcloud run services update my-service \\
  --set-env-vars="NODE_ENV=production,LOG_LEVEL=info"

# Use Secret Manager
gcloud run services update my-service \\
  --set-secrets="API_KEY=api-key-secret:latest"
\`\`\`

## Traffic Management
\`\`\`bash
# Canary deploy (10% traffic to new revision)
gcloud run services update-traffic my-service \\
  --to-revisions=LATEST=10

# Rollback to previous
gcloud run services update-traffic my-service \\
  --to-revisions=my-service-00001-abc=100
\`\`\`

## Best Practices
- Set min-instances=1 for low-latency production services
- Use VPC connector for private network access
- Enable Cloud Armor for WAF/rate limiting
- Monitor with uptime checks + alert policies
`,
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline Guide",
    description:
      "Cloud Build pipeline design: build, test, scan, deploy, smoke test, rollback. Includes caching, parallel steps, secret injection.",
    version: "1.0.0",
    category: "devops",
    trigger_patterns: JSON.stringify([
      "ci/cd",
      "pipeline",
      "continuous integration",
      "cloud build",
    ]),
    asset_path: "skills/ci-cd-pipeline/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["ci-cd", "pipeline", "cloud-build", "devops"]),
    skill_md: `# CI/CD Pipeline Guide

## Overview
Design and implement CI/CD pipelines using Google Cloud Build. Covers the full pipeline lifecycle: build, test, security scan, deploy, smoke test, and automatic rollback.

## Pipeline Stages

### 1. Build
\`\`\`yaml
- name: node:20
  entrypoint: npm
  args: ['ci', '--cache', '/workspace/.npm']
  volumes:
    - name: npm-cache
      path: /workspace/.npm
\`\`\`

### 2. Test
\`\`\`yaml
- name: node:20
  entrypoint: npm
  args: ['test']
  env: ['CI=true']
\`\`\`

### 3. Security Scan
\`\`\`yaml
- name: gcr.io/cloud-builders/gcloud
  entrypoint: bash
  args:
    - -c
    - |
      gcloud artifacts docker images scan \\
        \$_REGION-docker.pkg.dev/\$PROJECT_ID/\$_REPO/\$_IMAGE:\$SHORT_SHA \\
        --format=json > /workspace/scan.json
      VULNS=$(cat /workspace/scan.json | jq '.vulnerabilities | length')
      if [ "$VULNS" -gt "0" ]; then echo "VULNERABILITIES FOUND"; exit 1; fi
\`\`\`

### 4. Deploy
\`\`\`yaml
- name: gcr.io/cloud-builders/gcloud
  args:
    - run
    - deploy
    - \$_SERVICE
    - --image=\$_REGION-docker.pkg.dev/\$PROJECT_ID/\$_REPO/\$_IMAGE:\$SHORT_SHA
    - --region=\$_REGION
    - --no-traffic
\`\`\`

### 5. Smoke Test
\`\`\`yaml
- name: gcr.io/cloud-builders/curl
  entrypoint: bash
  args:
    - -c
    - |
      URL=$(gcloud run services describe \$_SERVICE --region=\$_REGION --format="value(status.url)")
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" \$URL/health)
      if [ "\$STATUS" != "200" ]; then exit 1; fi
\`\`\`

### 6. Promote or Rollback
\`\`\`yaml
# On success: route traffic
- name: gcr.io/cloud-builders/gcloud
  args: [run, services, update-traffic, \$_SERVICE, --to-latest, --region=\$_REGION]

# On failure: set traffic to 0 for latest
- name: gcr.io/cloud-builders/gcloud
  args: [run, services, update-traffic, \$_SERVICE, --to-revisions=LATEST=0, --region=\$_REGION]
\`\`\`

## Best Practices
- Cache npm/pip dependencies between builds
- Run linting and type-checking as early pipeline steps
- Use substitution variables for environment-specific values
- Tag images with commit SHA (not \`latest\`)
- Always include a smoke test before routing traffic
- Set up Slack/email notifications for failures
`,
  },

  // --- frontend (3) ---
  {
    id: "react-patterns",
    name: "Modern React Patterns",
    description:
      "Hooks composition, custom hooks, render props, compound components, context patterns, error boundaries, Suspense, React Query integration.",
    version: "1.0.0",
    category: "frontend",
    trigger_patterns: JSON.stringify([
      "react patterns",
      "react hooks",
      "react best practices",
    ]),
    asset_path: "skills/react-patterns/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["react", "hooks", "patterns", "frontend"]),
    skill_md: `# Modern React Patterns

## Overview
Production-ready React patterns used in the MAL frontend. All patterns use functional components with hooks — no class components.

## 1. Custom Hooks (Composition)
Extract reusable logic into custom hooks:
\`\`\`tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
\`\`\`

## 2. React Query (Server State)
\`\`\`tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['catalog', 'skills', { category }],
  queryFn: () => fetchSkills({ category }),
  staleTime: 30_000,
  refetchOnWindowFocus: false,
});
\`\`\`

## 3. Compound Components
\`\`\`tsx
function Tabs({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
}
Tabs.List = TabsList;
Tabs.Panel = TabsPanel;
\`\`\`

## 4. Error Boundaries
\`\`\`tsx
<ErrorBoundary fallback={<ErrorCard />}>
  <Suspense fallback={<Skeleton />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
\`\`\`

## 5. Context Pattern
\`\`\`tsx
const ThemeContext = createContext<Theme | null>(null);

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
\`\`\`

## 6. Render Props (Rare, for Max Flexibility)
\`\`\`tsx
<DataFetcher url="/api/items">
  {({ data, loading }) => loading ? <Spinner /> : <ItemList items={data} />}
</DataFetcher>
\`\`\`

## MAL Conventions
- Prefer hooks over HOCs or render props
- Use React Query for all server state
- Use useState/useRef for local UI state
- Components: one file per component, co-locate styles
- Name files PascalCase for components, camelCase for hooks
`,
  },
  {
    id: "tailwind-design-system",
    name: "Tailwind Design System",
    description:
      "Design tokens, custom color palettes (mal-*), responsive breakpoints, component recipes, dark mode, animation utilities.",
    version: "1.0.0",
    category: "frontend",
    trigger_patterns: JSON.stringify([
      "tailwind",
      "design system",
      "styling",
      "ui components",
    ]),
    asset_path: "skills/tailwind-design-system/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["tailwind", "css", "design", "frontend"]),
    skill_md: `# Tailwind Design System

## Overview
MAL's custom Tailwind CSS design system. Built on Tailwind CSS 4 with custom color palette, responsive patterns, and component recipes.

## Color Palette (mal-*)
\`\`\`css
@theme {
  --color-mal-50: #eff6ff;
  --color-mal-100: #dbeafe;
  --color-mal-200: #bfdbfe;
  --color-mal-300: #93c5fd;
  --color-mal-400: #60a5fa;
  --color-mal-500: #3b82f6;
  --color-mal-600: #2563eb;
  --color-mal-700: #1d4ed8;
  --color-mal-800: #1e40af;
  --color-mal-900: #1e3a8a;
  --color-mal-950: #172554;
}
\`\`\`

## Component Recipes

### Button
\`\`\`html
<button class="bg-mal-600 hover:bg-mal-700 text-white px-4 py-2 rounded-lg
               font-medium transition-colors duration-150
               focus:outline-none focus:ring-2 focus:ring-mal-500 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed">
  Click me
</button>
\`\`\`

### Card
\`\`\`html
<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200
            dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Content</p>
</div>
\`\`\`

### Badge
\`\`\`html
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
             font-medium bg-mal-100 text-mal-800 dark:bg-mal-900 dark:text-mal-200">
  devops
</span>
\`\`\`

## Responsive Breakpoints
- \`sm:\` — 640px (mobile landscape)
- \`md:\` — 768px (tablet)
- \`lg:\` — 1024px (desktop)
- \`xl:\` — 1280px (wide desktop)

## Dark Mode
Use \`dark:\` variant. Toggle via class strategy:
\`\`\`html
<html class="dark">
\`\`\`

## Animation Utilities
\`\`\`css
@keyframes slide-up { from { transform: translateY(10px); opacity: 0; } }
.animate-slide-up { animation: slide-up 0.3s ease-out; }
\`\`\`

## Best Practices
- Use \`cn()\` utility for conditional class merging
- Prefer Tailwind utilities over custom CSS
- Extract repeated patterns into component variants, not CSS classes
- Use CSS variables for dynamic theming
`,
  },
  {
    id: "vite-optimization",
    name: "Vite Build Optimization",
    description:
      "Code splitting, lazy routes, chunk analysis, tree shaking, asset optimization, proxy config, HMR tuning, env variable handling.",
    version: "1.0.0",
    category: "frontend",
    trigger_patterns: JSON.stringify([
      "vite",
      "build optimization",
      "code splitting",
      "bundling",
    ]),
    asset_path: "skills/vite-optimization/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["vite", "build", "optimization", "frontend"]),
    skill_md: `# Vite Build Optimization

## Overview
Optimize Vite builds for production. Covers code splitting, lazy loading, chunk analysis, and development experience tuning.

## Code Splitting with Lazy Routes
\`\`\`tsx
const SprintBoard = lazy(() => import('./pages/SprintBoard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

<Route path="/sprint" element={
  <Suspense fallback={<PageSkeleton />}>
    <SprintBoard />
  </Suspense>
} />
\`\`\`

## Manual Chunks
\`\`\`ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
\`\`\`

## Chunk Analysis
\`\`\`bash
npx vite-bundle-visualizer
\`\`\`

## Proxy Configuration (Dev)
\`\`\`ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
    '/ws': { target: 'ws://localhost:8000', ws: true },
  },
},
\`\`\`

## Environment Variables
\`\`\`ts
// Only VITE_ prefixed vars are exposed to client
const apiUrl = import.meta.env.VITE_API_URL;
\`\`\`

## Best Practices
- Enable \`build.sourcemap: true\` for debugging production issues
- Use \`optimizeDeps.include\` for large deps that slow HMR
- Set \`build.target: 'es2020'\` for modern browsers
- Analyze bundle size after each dependency addition
`,
  },

  // --- data (3) ---
  {
    id: "mcp-tool-development",
    name: "MCP Tool Development",
    description:
      "How to build MCP tools with @modelcontextprotocol/sdk: server.registerTool(), Zod schemas, annotations, error handling, streaming, testing with MCP Inspector.",
    version: "1.0.0",
    category: "data",
    trigger_patterns: JSON.stringify([
      "mcp tool",
      "create tool",
      "registerTool",
      "mcp development",
    ]),
    asset_path: "skills/mcp-tool-development/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["mcp", "tools", "sdk", "development"]),
    skill_md: `# MCP Tool Development

## Overview
Guide for building MCP (Model Context Protocol) tools using the official SDK. MAL uses server.registerTool() with Zod schemas and structured annotations.

## Tool Registration Pattern
\`\`\`typescript
import { z } from "zod";

server.registerTool("mal_my_tool", {
  title: "Human-Readable Title",
  description: "Detailed description for LLM discoverability. Explain what the tool does, when to use it, and what it returns.",
  annotations: {
    readOnlyHint: true,     // Safe to call without side effects
    // destructiveHint: true,  // Deletes data (requires confirmation)
    // openWorldHint: true,    // Makes external network calls
  },
  inputSchema: {
    query: z.string().describe("Search query text"),
    limit: z.number().optional().describe("Max results (default 20)"),
    category: z.enum(["devops", "frontend"]).optional().describe("Filter by category"),
  },
}, async (args) => {
  try {
    const results = await db.list(COLLECTIONS.SKILLS, {
      filters: { category: args.category },
      limit: args.limit ?? 20,
    });

    return {
      content: [{
        type: "text" as const,
        text: formatAsMarkdown(results),
      }],
    };
  } catch (error) {
    return handleToolError(error, "mal_my_tool");
  }
});
\`\`\`

## Naming Convention
- Prefix: \`mal_\` (Monterrey Agentic Labs)
- Pattern: \`mal_{action}_{resource}\` (snake_case)
- Examples: \`mal_list_skills\`, \`mal_create_sprint\`, \`mal_get_leaderboard\`

## Error Response Pattern
\`\`\`typescript
return {
  content: [{ type: "text" as const, text: "Error: Not found. Try: Use mal_list_skills first." }],
  isError: true,
};
\`\`\`

## Testing with MCP Inspector
\`\`\`bash
npx @modelcontextprotocol/inspector node dist/index.js
\`\`\`

## Key Rules
- Every inputSchema field MUST have .describe() for LLM discoverability
- Use .strict() on all Zod object schemas to catch extra fields
- Always handle errors with handleToolError()
- Return markdown-formatted text for readability
- Use annotations correctly (readOnlyHint for GETs, destructiveHint for DELETEs)
`,
  },
  {
    id: "api-design-rest",
    name: "REST API Design",
    description:
      "Resource naming, HTTP methods, pagination, filtering, error responses, versioning, OpenAPI spec, rate limiting. Aligned with MAL backend patterns.",
    version: "1.0.0",
    category: "data",
    trigger_patterns: JSON.stringify([
      "api design",
      "rest api",
      "endpoint design",
      "api patterns",
    ]),
    asset_path: "skills/api-design-rest/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["api", "rest", "design", "backend"]),
    skill_md: `# REST API Design

## Overview
Standards for designing REST APIs used in the MAL platform. Covers naming, methods, pagination, errors, and versioning.

## Resource Naming
- Use nouns, not verbs: \`/api/skills\` not \`/api/getSkills\`
- Plural for collections: \`/api/sprints\`, \`/api/work-items\`
- Nested for relationships: \`/api/sprints/:id/work-items\`
- Kebab-case for multi-word: \`/api/work-items\`

## HTTP Methods
| Method | Action | Idempotent | Example |
|--------|--------|------------|---------|
| GET | Read | Yes | \`GET /api/skills\` |
| POST | Create | No | \`POST /api/skills\` |
| PUT | Replace | Yes | \`PUT /api/skills/:id\` |
| PATCH | Partial update | Yes | \`PATCH /api/skills/:id\` |
| DELETE | Remove | Yes | \`DELETE /api/skills/:id\` |

## Pagination
\`\`\`json
{
  "items": [...],
  "total": 42,
  "count": 20,
  "offset": 0,
  "has_more": true,
  "next_offset": 20
}
\`\`\`

## Error Responses
\`\`\`json
{
  "error": "not_found",
  "message": "Skill 'xyz' not found",
  "suggestion": "Use GET /api/skills to list available skills"
}
\`\`\`

## Filtering
Query parameters: \`GET /api/work-items?status=in_progress&assignee=jorge&sprint_id=sprint-7\`

## Best Practices
- Return 201 + Location header on POST success
- Return 204 on DELETE success
- Use ETags for caching
- Rate limit by API key (not just IP)
- Document with OpenAPI 3.x
`,
  },
  {
    id: "sqlite-patterns",
    name: "SQLite Best Practices",
    description:
      "WAL mode, FTS5 full-text search, JSON storage, indexes, migrations, boolean handling, connection pooling, backup strategies. MAL-specific examples.",
    version: "1.0.0",
    category: "data",
    trigger_patterns: JSON.stringify([
      "sqlite",
      "database patterns",
      "fts5",
      "sql queries",
    ]),
    asset_path: "skills/sqlite-patterns/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["sqlite", "database", "fts5", "data"]),
    skill_md: `# SQLite Best Practices

## Overview
SQLite patterns used in MAL's on-premise deployment. Covers WAL mode, FTS5, JSON storage, and production hardening.

## WAL Mode
\`\`\`sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
\`\`\`
WAL (Write-Ahead Logging) allows concurrent reads during writes. Always enable for server applications.

## FTS5 Full-Text Search
\`\`\`sql
CREATE VIRTUAL TABLE catalog_fts USING fts5(
    id, name, description, tags, collection,
    content='',
    tokenize='porter unicode61'
);

-- Search
SELECT * FROM catalog_fts WHERE catalog_fts MATCH 'docker OR deploy';
\`\`\`

## JSON Storage
SQLite stores arrays and objects as JSON strings:
\`\`\`typescript
// Serialize on write
const tags = JSON.stringify(["docker", "devops"]);

// Deserialize on read
const parsed = JSON.parse(row.tags);
\`\`\`

## Boolean Handling
SQLite has no native boolean. Store as INTEGER (0/1):
\`\`\`typescript
function serializeValue(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return value;
}
\`\`\`

## Index Strategy
\`\`\`sql
-- Filter columns
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_sprint ON work_items(sprint_id);

-- Composite for common queries
CREATE INDEX idx_items_sprint_status ON work_items(sprint_id, status);
\`\`\`

## Backup
\`\`\`bash
# Online backup (safe even during writes with WAL)
sqlite3 catalog.db ".backup backup-$(date +%Y%m%d).db"
\`\`\`

## Best Practices
- Use prepared statements (never string interpolation)
- Wrap multi-row inserts in transactions
- Use INSERT OR IGNORE for idempotent seeding
- Keep WAL file size manageable with periodic checkpoints
- Test with :memory: database in unit tests
`,
  },

  // --- document (3) ---
  {
    id: "code-review-checklist",
    name: "Code Review Checklist",
    description:
      "Security (OWASP top 10), performance, readability, testing, error handling, naming, SOLID principles. Tailored for TypeScript + Python codebases.",
    version: "1.0.0",
    category: "document",
    trigger_patterns: JSON.stringify([
      "code review",
      "pr review",
      "review checklist",
    ]),
    asset_path: "skills/code-review-checklist/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["review", "quality", "security", "document"]),
    skill_md: `# Code Review Checklist

## Overview
Structured checklist for reviewing code changes in the MAL platform. Covers security, performance, readability, and testing.

## Security
- [ ] No hardcoded secrets, tokens, or API keys
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (input sanitization, output encoding)
- [ ] CSRF protection in place for mutations
- [ ] Authentication/authorization checks on endpoints
- [ ] No command injection (avoid shell exec with user input)
- [ ] Dependencies checked for known vulnerabilities

## Performance
- [ ] No N+1 query patterns
- [ ] Database indexes exist for filter/sort columns
- [ ] Large lists paginated (no unbounded queries)
- [ ] Expensive operations are async or cached
- [ ] No memory leaks (event listeners cleaned up, streams closed)

## Readability
- [ ] Functions are small and do one thing
- [ ] Variable names are descriptive and consistent
- [ ] No magic numbers (use named constants)
- [ ] Complex logic has explanatory comments
- [ ] Consistent code style (matches project conventions)

## Testing
- [ ] New code has unit tests
- [ ] Edge cases covered (empty input, null, boundary values)
- [ ] Tests are deterministic (no flaky timing dependencies)
- [ ] Error paths tested (not just happy path)
- [ ] Integration tests for API endpoints

## Error Handling
- [ ] Errors are caught and handled appropriately
- [ ] Error messages are helpful (include context and suggestions)
- [ ] No swallowed errors (catch without handling)
- [ ] Validation at system boundaries (user input, API responses)

## TypeScript Specific
- [ ] No \`any\` types (use \`unknown\` with type guards)
- [ ] Strict null checks handled
- [ ] Interfaces used for data shapes
- [ ] Enums or const arrays for fixed sets

## Python Specific
- [ ] Type hints on function signatures
- [ ] Pydantic models for data validation
- [ ] Async/await used correctly (no blocking in async context)
- [ ] Context managers for resource cleanup
`,
  },
  {
    id: "technical-writing",
    name: "Technical Writing Standards",
    description:
      "CLAUDE.md structure, README conventions, API docs, inline comments, architecture diagrams (ASCII), changelog format, decision records (ADR).",
    version: "1.0.0",
    category: "document",
    trigger_patterns: JSON.stringify([
      "technical writing",
      "documentation",
      "readme",
      "claude.md",
    ]),
    asset_path: "skills/technical-writing/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["documentation", "writing", "standards", "document"]),
    skill_md: `# Technical Writing Standards

## Overview
Documentation standards for the MAL platform. Covers CLAUDE.md, README, API docs, and architecture diagrams.

## CLAUDE.md Structure
The CLAUDE.md file is the primary documentation for Claude Code. Structure:

1. **Project Overview** — What it is, tech stack, high-level purpose
2. **Repository Structure** — File tree with annotations
3. **Build & Dev Commands** — How to build, test, run
4. **Architecture** — Diagrams (ASCII), data flow, key abstractions
5. **Tool/API Map** — Complete reference of all tools/endpoints
6. **Data Model** — Tables/collections with field descriptions
7. **Configuration** — Env vars, connection strings, feature flags
8. **Conventions** — Code style, naming, commit messages
9. **Test Status** — Which tests exist, what they cover
10. **Known Issues** — Gotchas, workarounds, fixed bugs

## ASCII Architecture Diagrams
\`\`\`
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───►│ Backend  │───►│ Database │
│ React    │    │ FastAPI  │    │ SQLite   │
└──────────┘    └──────────┘    └──────────┘
\`\`\`
Use box-drawing characters: \`┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼ ► ▼\`

## README Conventions
- Start with project name + one-line description
- Include badges (build status, version, license)
- Quick start in < 5 steps
- Link to detailed docs (CLAUDE.md)

## API Documentation
- Describe each endpoint: method, path, params, response
- Include curl examples
- Document error responses
- Use tables for parameter lists

## Inline Comments
- Comment the WHY, not the WHAT
- Don't comment obvious code
- Use TODO/FIXME/HACK tags consistently
- Reference issue IDs when relevant

## Decision Records (ADR)
Format: Title, Status, Context, Decision, Consequences
Keep in \`docs/decisions/\` directory.
`,
  },
  {
    id: "sprint-planning-guide",
    name: "Sprint Planning Guide",
    description:
      "Story point estimation (Fibonacci), capacity planning, sprint goal setting, backlog refinement, definition of done, velocity calculation, retrospective formats.",
    version: "1.0.0",
    category: "document",
    trigger_patterns: JSON.stringify([
      "sprint planning",
      "story points",
      "velocity",
      "scrum",
    ]),
    asset_path: "skills/sprint-planning-guide/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["agile", "scrum", "sprint", "planning", "document"]),
    skill_md: `# Sprint Planning Guide

## Overview
Guide for planning and executing sprints in the MAL platform. Covers estimation, capacity planning, goals, and retrospectives.

## Story Point Estimation (Fibonacci)
| Points | Complexity | Example |
|--------|-----------|---------|
| 1 | Trivial | Fix a typo, update a constant |
| 2 | Simple | Add a field to an existing form |
| 3 | Small | New API endpoint with tests |
| 5 | Medium | New feature with UI + backend |
| 8 | Large | Multi-service integration |
| 13 | Very Large | New subsystem or major refactor |
| 21 | Epic-sized | Break this down further |

## Capacity Planning
\`\`\`
Team Capacity = (Number of devs) x (Available days) x (Focus factor)
Focus factor: 0.7 for experienced teams, 0.5 for new teams
Example: 3 devs x 10 days x 0.7 = 21 story points
\`\`\`

## Sprint Goal
- One sentence describing what the sprint delivers
- Should be achievable and measurable
- Example: "Deliver gamification MVP — XP, levels, and leaderboard visible in the UI"

## Definition of Done
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner accepted

## Velocity Calculation
\`\`\`
Velocity = Story points completed (status = done) per sprint
Rolling average = (last 3 sprints) / 3
\`\`\`

## Retrospective Formats

### Start-Stop-Continue
- **Start**: Things we should begin doing
- **Stop**: Things that aren't working
- **Continue**: Things that are going well

### 4Ls (Liked, Learned, Lacked, Longed For)
Quick and positive-focused format.

## MAL Sprint Workflow
1. Backlog refinement (before sprint)
2. Sprint planning (day 1)
3. Daily standups (async via MCP interactions)
4. Sprint review (demo day)
5. Retrospective (AI-assisted via Sprint Reporter agent)
`,
  },

  // --- custom (2) ---
  {
    id: "team-onboarding",
    name: "Team Onboarding",
    description:
      "New member setup guide: repo clone, env setup, MCP connection, Claude Code config, first build, first test, team conventions, who to ask for what.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "onboarding",
      "new member",
      "getting started",
      "setup guide",
    ]),
    asset_path: "skills/team-onboarding/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["onboarding", "setup", "team", "custom"]),
    skill_md: `# Team Onboarding

## Overview
Step-by-step guide for new team members joining the MAL platform team.

## Day 1: Environment Setup

### 1. Clone the Repository
\`\`\`bash
git clone <repo-url>
cd v001
\`\`\`

### 2. Install Dependencies
\`\`\`bash
# MCP Server (on-premise)
cd on-premise && npm install && npm run setup

# Frontend
cd ../front/frontend && npm install

# Backend
cd ../backend && pip install -r requirements.txt
cp .env.example .env  # Fill in OPENAI_API_KEY and MCP_API_KEY
\`\`\`

### 3. First Build & Test
\`\`\`bash
cd on-premise && npm run build && npm test    # 10/10 tests
cd ../front/backend && pytest                  # 3/3 tests
cd ../frontend && npm run build                # 0 errors
\`\`\`

### 4. Connect Claude Code to MCP
\`\`\`bash
claude mcp add mal-mcp-hub -s project \\
  -e TRANSPORT=stdio \\
  -e SQLITE_PATH=./data/catalog.db \\
  -e ASSETS_PATH=./data/assets \\
  -- node on-premise/dist/index.js
\`\`\`

### 5. Register Yourself as Team Member
In Claude Code:
> "Register me as a team member: id=your-name, name=Your Full Name, email=your@email.com, role=developer"

This creates your profile for gamification and contribution tracking.

## Day 2: Team Conventions
- Read CLAUDE.md (root) thoroughly
- Read front/CLAUDE.md for frontend/backend conventions
- Understand the tool naming convention: \`mal_{action}_{resource}\`
- Review branch naming: \`feature/mal-xxx-description\`
- Use conventional commits: \`feat:\`, \`fix:\`, \`docs:\`

## Key Contacts
- Repo structure questions → CLAUDE.md
- MCP tool questions → Use \`mal_search_catalog\`
- Sprint questions → Use \`mal_get_sprint\`
- Stuck on something → Log an interaction, the team can search it later
`,
  },
  {
    id: "git-workflow-mal",
    name: "MAL Git Workflow",
    description:
      "Branch naming (feature/mal-xxx), conventional commits (feat:, fix:, docs:), PR templates, review process, merge strategy, release flow, hotfix process.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "git workflow",
      "branch naming",
      "commit convention",
      "pr process",
    ]),
    asset_path: "skills/git-workflow-mal/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["git", "workflow", "conventions", "custom"]),
    skill_md: `# MAL Git Workflow

## Overview
Git workflow conventions for the MAL platform team.

## Branch Naming
\`\`\`
feature/mal-001-description    # New feature
fix/mal-002-description        # Bug fix
docs/mal-003-description       # Documentation
infra/mal-004-description      # Infrastructure/DevOps
\`\`\`

## Conventional Commits
\`\`\`
feat: add gamification leaderboard endpoint
fix: correct XP calculation for streak multiplier
docs: update CLAUDE.md with Phase 5 roadmap
infra: add Terraform monitoring alerts
refactor: extract pagination utility
test: add sprint reporter agent tests
chore: upgrade dependencies
\`\`\`

Format: \`<type>: <description>\`
- Keep subject line under 72 characters
- Use imperative mood ("add" not "added")
- Body optional, separated by blank line

## Pull Request Process
1. Create branch from \`dev\`
2. Make changes, commit with conventional commits
3. Push and create PR
4. PR title = conventional commit format
5. PR body: Summary + Test Plan
6. Get 1+ approval
7. Squash merge into \`dev\`

## Merge Strategy
- \`dev\` ← squash merge from feature branches
- \`main\` ← merge commit from \`dev\` (release)
- Never force push to \`dev\` or \`main\`

## Release Flow
1. Create \`release/vX.Y.Z\` branch from \`dev\`
2. Final testing and fixes
3. Merge to \`main\` + tag
4. Merge back to \`dev\`

## Hotfix Process
1. Branch from \`main\`: \`fix/hotfix-description\`
2. Fix and test
3. Merge to \`main\` + \`dev\`
4. Tag patch version
`,
  },

  // --- NEW: community-adapted skills (8) ---
  {
    id: "test-driven-development",
    name: "Test-Driven Development (TDD)",
    description:
      "Write the test first, watch it fail, write minimal code to pass. Red-Green-Refactor cycle with MAL-specific vitest and pytest patterns.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "tdd",
      "test driven",
      "test first",
      "red green refactor",
    ]),
    asset_path: "skills/test-driven-development/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from obra/superpowers)",
    tags: JSON.stringify(["tdd", "testing", "vitest", "pytest", "quality"]),
    skill_md: `# Test-Driven Development (TDD)

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

Adapted from [obra/superpowers](https://github.com/obra/superpowers).

## When to Use

- New features
- Bug fixes
- Refactoring
- Behavior changes

**Exceptions:** Throwaway prototypes, generated code, configuration files.

## The Iron Law

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

Write code before the test? Delete it. Start over. No exceptions.

## Red-Green-Refactor

### RED — Write Failing Test

Write one minimal test showing what should happen. Requirements: one behavior per test, clear descriptive name, real code (no mocks unless unavoidable).

### Verify RED — Watch It Fail

MANDATORY. Never skip. Run tests and confirm: test fails (not errors), failure message is expected, fails because feature is missing.

### GREEN — Minimal Code

Write simplest code to pass the test. Don't add features beyond what the test requires.

### Verify GREEN — Watch It Pass

Confirm: test passes, other tests still pass, output pristine.

### REFACTOR — Clean Up

After green only: remove duplication, improve names, extract helpers. Keep tests green.

## Verification Checklist

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass with pristine output
- [ ] Edge cases and errors covered
`,
  },
  {
    id: "prompt-engineering",
    name: "Prompt Engineering Patterns",
    description:
      "Advanced prompt engineering: few-shot learning, chain-of-thought, template systems, system prompt design, agent prompting best practices.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "prompt engineering",
      "few shot",
      "chain of thought",
      "system prompt",
      "agent prompt",
    ]),
    asset_path: "skills/prompt-engineering/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from NeoLabHQ/context-engineering-kit)",
    tags: JSON.stringify(["prompts", "llm", "few-shot", "chain-of-thought", "agents"]),
    skill_md: `# Prompt Engineering Patterns

Advanced prompt engineering techniques to maximize LLM performance, reliability, and controllability.

## Core Techniques

### 1. Few-Shot Learning
Teach the model by showing examples instead of explaining rules. Include 2-5 input-output pairs.

### 2. Chain-of-Thought Prompting
Request step-by-step reasoning before the final answer. Improves accuracy on analytical tasks by 30-50%.

### 3. Prompt Optimization
Iterate systematically: start simple, measure, refine.

### 4. Template Systems
Build reusable prompt structures with variables.

### 5. System Prompt Design
Set global behavior that persists across the conversation: role, expertise, output format, safety guidelines.

## Instruction Hierarchy

[System Context] → [Task Instruction] → [Examples] → [Input Data] → [Output Format]

## Best Practices

1. Be Specific: Vague prompts produce inconsistent results
2. Show, Don't Tell: Examples are more effective than descriptions
3. Test Extensively: Evaluate on diverse inputs
4. Iterate Rapidly: Small changes can have large impacts
5. Version Control: Treat prompts as code

## Persuasion Principles for Agent Prompts

Based on Meincke et al. (2025): Authority (imperative language), Commitment (require announcements), Scarcity (time-bound requirements), Social Proof (universal patterns), Unity (collaborative language).

See full SKILL.md for detailed examples, MAL-specific patterns, and token efficiency tips.
`,
  },
  {
    id: "software-architecture",
    name: "Software Architecture",
    description:
      "Quality-focused architecture guidance: Clean Architecture, DDD, early return pattern, library-first approach, anti-patterns to avoid. MAL adapter pattern examples.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "architecture",
      "clean architecture",
      "domain driven design",
      "ddd",
      "design patterns",
    ]),
    asset_path: "skills/software-architecture/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from NeoLabHQ/context-engineering-kit)",
    tags: JSON.stringify(["architecture", "ddd", "clean-architecture", "design-patterns"]),
    skill_md: `# Software Architecture

Quality-focused software architecture guidance based on Clean Architecture and Domain-Driven Design principles.

## Code Style Rules

- Early return pattern: Always use early returns over nested conditions
- Avoid code duplication through reusable functions and modules
- Decompose long functions (>80 lines); split files >200 lines
- Use arrow functions when possible

## Library-First Approach

ALWAYS search for existing solutions before writing custom code. Custom code is justified for domain-specific logic, performance-critical paths, or security-sensitive code.

## Architecture and Design

- Follow domain-driven design and ubiquitous language
- Separate domain entities from infrastructure concerns
- Keep business logic independent of frameworks
- AVOID generic names: utils, helpers, common, shared
- USE domain-specific names: OrderCalculator, UserAuthenticator

## Anti-Patterns to Avoid

- NIH Syndrome: Don't build what already exists
- Mixing business logic with UI components
- Database queries in controllers
- Generic naming (utils.js with 50 functions)

See full SKILL.md for MAL adapter pattern examples and file organization conventions.
`,
  },
  {
    id: "changelog-generator",
    name: "Changelog Generator",
    description:
      "Generate structured changelogs from git history. Categorize by conventional commits, produce user-friendly release notes with MAL sprint integration.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "changelog",
      "release notes",
      "what changed",
      "version history",
    ]),
    asset_path: "skills/changelog-generator/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team",
    tags: JSON.stringify(["changelog", "git", "release-notes", "documentation"]),
    skill_md: `# Changelog Generator

Generate structured changelogs from git commit history. Analyzes commits, categorizes changes, and produces user-friendly release notes.

## Process

1. Gather commits: git log between two refs (tags, dates, branches)
2. Categorize: Parse conventional commit prefixes (feat, fix, docs, infra, refactor, test)
3. Format: Group by category, include metrics (commit count, contributors)

## Conventional Commit Mapping

| Prefix | Category |
|--------|----------|
| feat: | New Features |
| fix: | Bug Fixes |
| docs: | Documentation |
| infra: | Infrastructure |
| refactor: | Code Improvements |
| test: | Tests |

## MAL Integration

Use mal_get_commit_activity for structured data, combine with mal_get_sprint and mal_list_work_items for sprint-based changelogs.

See full SKILL.md for automation script and best practices.
`,
  },
  {
    id: "subagent-driven-development",
    name: "Subagent-Driven Development",
    description:
      "Execute plans by dispatching fresh subagents per task with code review between tasks. Sequential and parallel execution modes for complex multi-step work.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "subagent",
      "parallel agents",
      "dispatch agent",
      "multi-agent execution",
    ]),
    asset_path: "skills/subagent-driven-development/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from obra/superpowers)",
    tags: JSON.stringify(["subagents", "parallel", "execution", "code-review", "agents"]),
    skill_md: `# Subagent-Driven Development

Create and execute plans by dispatching fresh subagents per task, with code review between tasks.

**Core principle:** Fresh subagent per task + review between tasks = high quality, fast iteration.

## Execution Modes

### Sequential Execution
For tightly coupled tasks: dispatch one agent per task, review after each, proceed to next.

### Parallel Execution
For independent tasks: dispatch multiple agents concurrently, review all results together.

### Parallel Investigation
For unrelated failures: group by domain, dispatch one agent per domain, integrate fixes.

## Agent Prompt Structure

Good prompts are: Focused (one domain), Self-contained (all context), Specific about output (what to return).

## When NOT to Use

- Related failures (fixing one might fix others)
- Need full context (requires seeing entire system)
- Shared state (agents would edit same files)
- Exploratory debugging (don't know what's broken yet)

See full SKILL.md for MAL integration examples and common mistakes.
`,
  },
  {
    id: "root-cause-tracing",
    name: "Root Cause Tracing",
    description:
      "Systematically trace bugs backward through the call stack to find the original trigger. Add instrumentation when needed. Fix at source with defense in depth.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "root cause",
      "trace bug",
      "debug deep",
      "call stack",
      "why does this fail",
    ]),
    asset_path: "skills/root-cause-tracing/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from NeoLabHQ/context-engineering-kit)",
    tags: JSON.stringify(["debugging", "root-cause", "tracing", "troubleshooting"]),
    skill_md: `# Root Cause Tracing

Systematically trace bugs backward through the call stack to find the original trigger.

**Core principle:** Trace backward through the call chain until you find the original trigger, then fix there.

## The Tracing Process

1. Observe the Symptom — What error appears?
2. Find Immediate Cause — What code directly causes it?
3. Ask: What Called This? — Trace one level up
4. Keep Tracing Up — What value was wrong? Where did it come from?
5. Find Original Trigger — The root cause
6. Fix at Source + Defense in Depth — Fix and add validation layers

## Key Rule

NEVER fix just where the error appears. Trace back to find the original trigger.

See full SKILL.md for real MAL examples (contributions table, user_achievements, command injection).
`,
  },
  {
    id: "kaizen",
    name: "Kaizen: Continuous Improvement",
    description:
      "Apply continuous improvement mindset: small iterative improvements, error-proof designs (Poka-Yoke), follow established patterns, avoid over-engineering (YAGNI/JIT).",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "kaizen",
      "continuous improvement",
      "poka yoke",
      "error proofing",
      "yagni",
    ]),
    asset_path: "skills/kaizen/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from NeoLabHQ/context-engineering-kit)",
    tags: JSON.stringify(["kaizen", "quality", "improvement", "poka-yoke", "yagni"]),
    skill_md: `# Kaizen: Continuous Improvement

Small improvements, continuously. Error-proof by design. Follow what works. Build only what's needed.

## The Four Pillars

### 1. Continuous Improvement (Kaizen)
Small, frequent improvements compound into major gains. Iterative refinement: make it work, make it clear, make it robust.

### 2. Poka-Yoke (Error Proofing)
Design systems that prevent errors at compile/design time. Use types to constrain inputs, validate at boundaries, fail at startup not in production.

### 3. Standardized Work
Follow established patterns. Consistency over cleverness. Check CLAUDE.md for project conventions.

### 4. Just-In-Time (JIT)
Build what's needed now. YAGNI: no "just in case" features. Abstract only when pattern proven across 3+ cases.

## Mindset

Good enough today, better tomorrow. Repeat.

See full SKILL.md for TypeScript examples, MAL conventions, and red flags.
`,
  },
  {
    id: "brainstorming",
    name: "Brainstorming Ideas Into Designs",
    description:
      "Turn ideas into fully formed designs through collaborative dialogue. Understand context, explore approaches, present validated designs incrementally.",
    version: "1.0.0",
    category: "custom",
    trigger_patterns: JSON.stringify([
      "brainstorm",
      "design session",
      "explore idea",
      "feature planning",
    ]),
    asset_path: "skills/brainstorming/SKILL.md",
    dependencies: JSON.stringify([]),
    author: "MAL Team (adapted from obra/superpowers)",
    tags: JSON.stringify(["brainstorming", "design", "planning", "ideation"]),
    skill_md: `# Brainstorming Ideas Into Designs

Turn ideas into fully formed designs and specs through collaborative dialogue.

## The Process

1. Understanding: Check project state, ask questions one at a time, prefer multiple choice
2. Exploring: Propose 2-3 approaches with trade-offs, lead with recommendation
3. Presenting: Break design into 200-300 word sections, validate each
4. Documenting: Write design doc, commit to git

## Key Principles

- One question at a time
- Multiple choice preferred
- YAGNI ruthlessly
- Explore alternatives (always 2-3 approaches)
- Incremental validation

## MAL Integration

Use MCP tools for context: mal_list_work_items (backlog), mal_get_sprint (current goal), mal_search_interactions (past discussions). Convert designs to work items via mal_create_work_item.

See full SKILL.md for design document format and MCP tool design example.
`,
  },
];

// ============================================================
// 3. COMMANDS (14)
// ============================================================

const commands = [
  // --- devops (5) ---
  {
    id: "start-dev-stack",
    name: "Start Dev Stack",
    description:
      "Start MCP server + backend + frontend in parallel. Checks ports, kills stale processes, validates .env files exist.",
    category: "devops",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
echo "Starting MAL Dev Stack..."

# Check and kill stale processes
for PORT in 3000 8000 5173; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

sleep 1

# Validate .env exists for backend
if [ ! -f "{{project_root}}/front/backend/.env" ]; then
  echo "WARNING: front/backend/.env not found. Copy from .env.example"
fi

# Start services in background
echo "Starting MCP Server (on-premise) on :3000..."
cd "{{project_root}}/on-premise" && API_KEY={{mcp_api_key}} TRANSPORT=http SQLITE_PATH=./data/catalog.db ASSETS_PATH=./data/assets node dist/index.js &

echo "Starting Backend (FastAPI) on :8000..."
cd "{{project_root}}/front/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 &

echo "Starting Frontend (Vite) on :5173..."
cd "{{project_root}}/front/frontend" && npm run dev &

echo ""
echo "All services starting. Health checks:"
sleep 3
curl -sf http://localhost:3000/health > /dev/null && echo "  MCP Server: OK" || echo "  MCP Server: STARTING..."
curl -sf http://localhost:8000/api/health > /dev/null && echo "  Backend:    OK" || echo "  Backend:    STARTING..."
curl -sf http://localhost:5173/ > /dev/null && echo "  Frontend:   OK" || echo "  Frontend:   STARTING..."
echo ""
echo "Dev stack launched. Press Ctrl+C to stop all."
wait`,
    parameters: JSON.stringify([
      {
        name: "project_root",
        type: "string",
        description: "Root path of the v001 project",
        required: true,
      },
      {
        name: "mcp_api_key",
        type: "string",
        description: "API key for MCP server",
        required: true,
        default: "dev-key",
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["dev", "stack", "start", "devops"]),
  },
  {
    id: "run-all-tests",
    name: "Run All Tests",
    description:
      "Run vitest (on-premise + nube) + pytest (front/backend) + tsc --noEmit (front/frontend). Reports total pass/fail counts.",
    category: "devops",
    shell: "bash",
    script_template: `#!/bin/bash
echo "Running all tests across the MAL platform..."
echo "============================================="
FAILED=0

echo ""
echo "[1/4] on-premise/ (vitest)"
cd "{{project_root}}/on-premise" && npm test 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[2/4] nube/ (vitest)"
cd "{{project_root}}/nube" && npm test 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[3/4] front/backend (pytest)"
cd "{{project_root}}/front/backend" && python -m pytest tests/ -v 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[4/4] front/frontend (tsc --noEmit)"
cd "{{project_root}}/front/frontend" && npx tsc --noEmit 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "============================================="
if [ $FAILED -eq 0 ]; then
  echo "ALL TESTS PASSED"
else
  echo "FAILURES: $FAILED suite(s) failed"
  exit 1
fi`,
    parameters: JSON.stringify([
      {
        name: "project_root",
        type: "string",
        description: "Root path of the v001 project",
        required: true,
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["test", "vitest", "pytest", "devops"]),
  },
  {
    id: "health-check-all",
    name: "Health Check All",
    description:
      "Curl MCP /health, backend /api/health, frontend root. Shows color-coded status output for all services.",
    category: "devops",
    shell: "bash",
    script_template: `#!/bin/bash
echo "MAL Platform Health Check"
echo "========================="

check_service() {
  local name=$1
  local url=$2
  local status
  status=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "  [OK]   $name ($url)"
  else
    echo "  [FAIL] $name ($url) — HTTP $status"
  fi
}

check_service "MCP Server"  "http://{{host}}:3000/health"
check_service "Backend API" "http://{{host}}:8000/api/health"
check_service "Frontend"    "http://{{host}}:{{frontend_port}}/"
echo ""
echo "Done."`,
    parameters: JSON.stringify([
      {
        name: "host",
        type: "string",
        description: "Host address",
        required: false,
        default: "localhost",
      },
      {
        name: "frontend_port",
        type: "string",
        description: "Frontend port",
        required: false,
        default: "5173",
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["health", "monitoring", "devops"]),
  },
  {
    id: "docker-build",
    name: "Docker Build",
    description:
      "Build Docker images for all MAL services with tagging and optional cache optimization.",
    category: "devops",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
TAG={{tag}}
echo "Building MAL Docker images with tag: $TAG"

echo "[1/3] Building MCP Server..."
docker build -t mal-mcp-hub:$TAG "{{project_root}}/on-premise"

echo "[2/3] Building Backend..."
docker build -t mal-backend:$TAG "{{project_root}}/front/backend"

echo "[3/3] Building Frontend..."
docker build -t mal-frontend:$TAG "{{project_root}}/front/frontend"

echo ""
echo "All images built:"
docker images | grep "mal-" | grep "$TAG"`,
    parameters: JSON.stringify([
      {
        name: "project_root",
        type: "string",
        description: "Root path of the v001 project",
        required: true,
      },
      {
        name: "tag",
        type: "string",
        description: "Docker image tag",
        required: false,
        default: "latest",
      },
    ]),
    requires_confirmation: 1,
    author: "MAL Team",
    tags: JSON.stringify(["docker", "build", "devops"]),
  },
  {
    id: "deploy-cloud-run",
    name: "Deploy to Cloud Run",
    description:
      "Submit Cloud Build, wait for deployment, run smoke test, display URL. Uses gcloud CLI.",
    category: "devops",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
PROJECT={{project_id}}
REGION={{region}}
SERVICE=mal-mcp-hub

echo "Deploying $SERVICE to Cloud Run ($REGION)..."

cd "{{project_root}}/nube"

# Submit build
gcloud builds submit --project=$PROJECT --config=cloudbuild.yaml \\
  --substitutions=_REGION=$REGION,_SERVICE=$SERVICE

# Get URL
URL=$(gcloud run services describe $SERVICE --project=$PROJECT --region=$REGION --format="value(status.url)")

echo ""
echo "Deployed to: $URL"
echo "Running smoke test..."

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$URL/health" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "Smoke test PASSED"
else
  echo "Smoke test FAILED (HTTP $STATUS)"
  exit 1
fi`,
    parameters: JSON.stringify([
      {
        name: "project_root",
        type: "string",
        description: "Root path of the v001 project",
        required: true,
      },
      {
        name: "project_id",
        type: "string",
        description: "GCP project ID",
        required: true,
      },
      {
        name: "region",
        type: "string",
        description: "GCP region",
        required: false,
        default: "us-central1",
      },
    ]),
    requires_confirmation: 1,
    author: "MAL Team",
    tags: JSON.stringify(["deploy", "cloud-run", "gcp", "devops"]),
  },

  // --- git (4) ---
  {
    id: "git-log-pretty",
    name: "Pretty Git Log",
    description:
      "Shows git log with oneline graph, decorations, and color. Configurable number of entries.",
    category: "git",
    shell: "bash",
    script_template: `git -C "{{repo_path}}" log --oneline --graph --decorate --all --color -n {{count}}`,
    parameters: JSON.stringify([
      {
        name: "repo_path",
        type: "string",
        description: "Path to git repository",
        required: false,
        default: ".",
      },
      {
        name: "count",
        type: "number",
        description: "Number of commits to show",
        required: false,
        default: "20",
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["git", "log", "visualization"]),
  },
  {
    id: "create-feature-branch",
    name: "Create Feature Branch",
    description:
      "Creates a feature/mal-{id}-{description} branch from latest dev. Follows MAL naming conventions.",
    category: "git",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
cd "{{repo_path}}"
BRANCH="feature/mal-{{id}}-{{description}}"
echo "Creating branch: $BRANCH"
git fetch origin
git checkout -b "$BRANCH" origin/dev 2>/dev/null || git checkout -b "$BRANCH"
echo "Branch '$BRANCH' created and checked out."`,
    parameters: JSON.stringify([
      {
        name: "repo_path",
        type: "string",
        description: "Path to git repository",
        required: false,
        default: ".",
      },
      {
        name: "id",
        type: "string",
        description: "Issue/feature ID (e.g., 042)",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "Short description in kebab-case",
        required: true,
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["git", "branch", "workflow"]),
  },
  {
    id: "git-branch-cleanup",
    name: "Clean Merged Branches",
    description:
      "List and delete local branches already merged into dev/main. Protects main, master, and dev branches.",
    category: "git",
    shell: "bash",
    script_template: `#!/bin/bash
cd "{{repo_path}}"
echo "Branches merged into current branch:"
MERGED=$(git branch --merged | grep -vE '(main|master|dev|develop|\\*)' || true)
if [ -z "$MERGED" ]; then
  echo "  No merged branches to clean."
  exit 0
fi
echo "$MERGED"
echo ""
echo "Deleting..."
echo "$MERGED" | xargs git branch -d
echo "Done."`,
    parameters: JSON.stringify([
      {
        name: "repo_path",
        type: "string",
        description: "Path to git repository",
        required: false,
        default: ".",
      },
    ]),
    requires_confirmation: 1,
    author: "MAL Team",
    tags: JSON.stringify(["git", "cleanup", "branches"]),
  },
  {
    id: "git-activity-report",
    name: "Git Activity Report",
    description:
      "Git log stats for a period: commits per author, files changed, insertions/deletions. Outputs markdown table.",
    category: "git",
    shell: "bash",
    script_template: `#!/bin/bash
cd "{{repo_path}}"
DAYS={{days}}
SINCE=$(date -v-\${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "$DAYS days ago" +%Y-%m-%d)
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
      printf "| %s | %d | %d | +%d | -%d |\\n", a, commits[a], total_files[a], total_ins[a], total_del[a]
  }
'`,
    parameters: JSON.stringify([
      {
        name: "repo_path",
        type: "string",
        description: "Path to git repository",
        required: false,
        default: ".",
      },
      {
        name: "days",
        type: "number",
        description: "Number of days to look back",
        required: false,
        default: "7",
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["git", "analytics", "report"]),
  },

  // --- database (3) ---
  {
    id: "sqlite-backup",
    name: "SQLite Backup",
    description:
      "Copy SQLite DB + WAL to timestamped backup file. Safe for online databases using WAL mode.",
    category: "database",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
DB="{{db_path}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP="\${DB%.db}-backup-$TIMESTAMP.db"
echo "Backing up $DB to $BACKUP..."
sqlite3 "$DB" ".backup '$BACKUP'"
echo "Backup complete: $BACKUP ($(du -h "$BACKUP" | cut -f1))"`,
    parameters: JSON.stringify([
      {
        name: "db_path",
        type: "string",
        description: "Path to SQLite database file",
        required: true,
        default: "./data/catalog.db",
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["sqlite", "backup", "database"]),
  },
  {
    id: "seed-catalog",
    name: "Seed Catalog",
    description:
      "Run the seed script to populate initial catalog data. Uses tsx to execute TypeScript directly.",
    category: "database",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
cd "{{project_root}}/on-premise"
echo "Seeding catalog..."
npx tsx scripts/seed-full-catalog.ts
echo "Seed complete."`,
    parameters: JSON.stringify([
      {
        name: "project_root",
        type: "string",
        description: "Root path of the v001 project",
        required: true,
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["seed", "catalog", "database"]),
  },
  {
    id: "reset-db",
    name: "Reset Database",
    description:
      "Drop and recreate all SQLite tables from schema.sql. DESTRUCTIVE — all data will be lost.",
    category: "database",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
DB="{{db_path}}"
SCHEMA="{{schema_path}}"
echo "WARNING: This will delete ALL data in $DB"
echo "Resetting database..."
rm -f "$DB" "$DB-wal" "$DB-shm"
sqlite3 "$DB" < "$SCHEMA"
echo "Database reset from $SCHEMA"
echo "Tables:"
sqlite3 "$DB" ".tables"`,
    parameters: JSON.stringify([
      {
        name: "db_path",
        type: "string",
        description: "Path to SQLite database file",
        required: true,
        default: "./data/catalog.db",
      },
      {
        name: "schema_path",
        type: "string",
        description: "Path to schema.sql file",
        required: true,
        default: "./data/schema.sql",
      },
    ]),
    requires_confirmation: 1,
    author: "MAL Team",
    tags: JSON.stringify(["sqlite", "reset", "database", "destructive"]),
  },

  // --- development (2) ---
  {
    id: "lint-all",
    name: "Lint All Projects",
    description:
      "ESLint for on-premise + nube TypeScript, tsc --noEmit for frontend. Reports issues per project.",
    category: "development",
    shell: "bash",
    script_template: `#!/bin/bash
echo "Linting all MAL projects..."
echo "==========================="
FAILED=0

echo ""
echo "[1/3] on-premise/ (eslint)"
cd "{{project_root}}/on-premise" && npm run lint 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[2/3] nube/ (eslint)"
cd "{{project_root}}/nube" && npm run lint 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[3/3] front/frontend (tsc --noEmit)"
cd "{{project_root}}/front/frontend" && npx tsc --noEmit 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "==========================="
if [ $FAILED -eq 0 ]; then
  echo "ALL LINT CHECKS PASSED"
else
  echo "$FAILED project(s) had lint issues"
  exit 1
fi`,
    parameters: JSON.stringify([
      {
        name: "project_root",
        type: "string",
        description: "Root path of the v001 project",
        required: true,
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["lint", "eslint", "quality", "development"]),
  },
  {
    id: "generate-api-docs",
    name: "Generate API Docs",
    description:
      "Extract OpenAPI schema from FastAPI backend and save as markdown. Requires the backend to be running.",
    category: "development",
    shell: "bash",
    script_template: `#!/bin/bash
set -e
BACKEND_URL="http://{{host}}:{{port}}"
OUTPUT="{{output_path}}"

echo "Fetching OpenAPI schema from $BACKEND_URL/openapi.json..."
curl -sf "$BACKEND_URL/openapi.json" | python3 -c "
import json, sys
spec = json.load(sys.stdin)
print('# ' + spec['info']['title'] + ' v' + spec['info']['version'])
print()
for path, methods in spec.get('paths', {}).items():
    for method, details in methods.items():
        print(f'## {method.upper()} {path}')
        print(details.get('summary', ''))
        print()
        if 'parameters' in details:
            print('**Parameters:**')
            for p in details['parameters']:
                print(f'- \`{p[\"name\"]}\` ({p.get(\"in\",\"query\")}): {p.get(\"description\",\"\")}')
            print()
        print('---')
        print()
" > "$OUTPUT"

echo "API docs written to $OUTPUT"`,
    parameters: JSON.stringify([
      {
        name: "host",
        type: "string",
        description: "Backend host",
        required: false,
        default: "localhost",
      },
      {
        name: "port",
        type: "number",
        description: "Backend port",
        required: false,
        default: "8000",
      },
      {
        name: "output_path",
        type: "string",
        description: "Output file path for generated docs",
        required: false,
        default: "./docs/api-reference.md",
      },
    ]),
    requires_confirmation: 0,
    author: "MAL Team",
    tags: JSON.stringify(["docs", "api", "openapi", "development"]),
  },
];

// ============================================================
// 4. SUBAGENTS (5)
// ============================================================

const subagents = [
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    description:
      "Reviews code changes for security (OWASP), performance, readability, test coverage. References team coding standards from skills catalog.",
    system_prompt: `You are a senior code reviewer for the MAL (Monterrey Agentic Labs) platform. Your job is to analyze code changes and provide actionable feedback.

## Review Areas
1. **Security**: Check for OWASP top 10 vulnerabilities (SQL injection, XSS, command injection, hardcoded secrets)
2. **Performance**: N+1 queries, unbounded loops, missing indexes, memory leaks
3. **Readability**: Clear naming, small functions, no magic numbers, consistent style
4. **Testing**: New code has tests, edge cases covered, error paths tested
5. **Error Handling**: Proper error handling, helpful error messages, no swallowed errors

## Team Standards
- TypeScript: strict mode, no \`any\`, use interfaces for data shapes
- Python: type hints, Pydantic v2 models, async/await
- Tool names: \`mal_{action}_{resource}\` (snake_case)
- Conventional commits: feat:, fix:, docs:, infra:

## Output Format
For each issue found, provide:
- **Severity**: critical / warning / suggestion
- **Location**: file:line
- **Issue**: What's wrong
- **Fix**: How to fix it

Use mal_search_catalog and mal_get_skill_content to reference team coding standards when relevant.`,
    model: "claude-sonnet-4-5-20250929",
    tools_allowed: JSON.stringify([
      "mal_search_catalog",
      "mal_get_skill_content",
    ]),
    max_turns: 10,
    input_schema: JSON.stringify({
      type: "object",
      properties: {
        code: { type: "string", description: "Code to review" },
        language: { type: "string", description: "Programming language" },
        context: {
          type: "string",
          description: "PR description or context about the change",
        },
      },
      required: ["code", "language"],
    }),
    output_format: "markdown",
    author: "MAL Team",
    tags: JSON.stringify(["review", "quality", "security"]),
  },
  {
    id: "sprint-planner",
    name: "Sprint Planner",
    description:
      "Helps plan sprints: estimates story points, identifies dependencies, balances workload, suggests sprint goals based on backlog and velocity history.",
    system_prompt: `You are a sprint planning assistant for the MAL platform team. Help the team plan effective sprints.

## Your Role
- Analyze the backlog and suggest which items to include in the next sprint
- Estimate story points using Fibonacci scale (1, 2, 3, 5, 8, 13)
- Identify dependencies between work items
- Balance workload across team members
- Suggest sprint goals based on priorities

## Process
1. Use mal_list_work_items to see the backlog (status=backlog or todo)
2. Use mal_get_sprint to check recent sprint velocity
3. Use mal_list_interactions to understand recent context and decisions
4. Calculate team capacity: (team_size × available_days × 0.7)
5. Select items that fit capacity, prioritizing: critical bugs > high stories > medium tasks

## Story Point Guidelines
| Points | Complexity | Example |
|--------|-----------|---------|
| 1 | Trivial | Fix a typo |
| 2 | Simple | Add a field |
| 3 | Small | New endpoint with tests |
| 5 | Medium | Feature with UI + backend |
| 8 | Large | Multi-service work |
| 13 | Very Large | Major refactor |

## Output
Provide a sprint plan with:
- Sprint goal (one sentence)
- Selected items with point estimates
- Team member assignments
- Total capacity vs committed points
- Identified risks or dependencies`,
    model: "claude-sonnet-4-5-20250929",
    tools_allowed: JSON.stringify([
      "mal_list_work_items",
      "mal_get_sprint",
      "mal_list_interactions",
    ]),
    max_turns: 8,
    input_schema: JSON.stringify({
      type: "object",
      properties: {
        sprint_name: { type: "string", description: "Name for the new sprint" },
        team_size: { type: "number", description: "Number of team members" },
        days: { type: "number", description: "Sprint duration in days" },
      },
      required: ["sprint_name"],
    }),
    output_format: "markdown",
    author: "MAL Team",
    tags: JSON.stringify(["sprint", "planning", "agile"]),
  },
  {
    id: "documentation-writer",
    name: "Documentation Writer",
    description:
      "Generates technical documentation: CLAUDE.md updates, README files, API docs, architecture diagrams. Follows team technical-writing standards.",
    system_prompt: `You are a technical documentation writer for the MAL platform. Generate clear, comprehensive documentation following team standards.

## Documentation Types
1. **CLAUDE.md**: Primary project documentation for Claude Code
2. **README.md**: Quick-start guides with badges and setup steps
3. **API Docs**: Endpoint reference with examples
4. **Architecture**: ASCII diagrams with data flow descriptions
5. **ADR**: Architecture Decision Records

## CLAUDE.md Structure
Follow this order:
1. Project Overview
2. Repository Structure
3. Build & Dev Commands
4. Architecture (with ASCII diagrams)
5. Tool/API Map
6. Data Model
7. Configuration (env vars)
8. Conventions
9. Test Status
10. Known Issues

## Writing Style
- Be concise but complete
- Use tables for structured data
- Include working code examples
- Use ASCII box-drawing characters for diagrams
- Reference existing skills for detailed guides

## Tools
Use mal_search_catalog, mal_get_skill_content, and mal_list_skills to:
- Find existing documentation standards
- Reference team conventions
- Avoid duplicating content that exists in skills`,
    model: "claude-sonnet-4-5-20250929",
    tools_allowed: JSON.stringify([
      "mal_search_catalog",
      "mal_get_skill_content",
      "mal_list_skills",
    ]),
    max_turns: 10,
    input_schema: JSON.stringify({
      type: "object",
      properties: {
        doc_type: {
          type: "string",
          enum: ["claude_md", "readme", "api_docs", "architecture", "adr"],
          description: "Type of documentation to generate",
        },
        subject: {
          type: "string",
          description: "What the documentation should cover",
        },
        context: {
          type: "string",
          description: "Additional context or requirements",
        },
      },
      required: ["doc_type", "subject"],
    }),
    output_format: "markdown",
    author: "MAL Team",
    tags: JSON.stringify(["documentation", "writing", "technical"]),
  },
  {
    id: "bug-analyzer",
    name: "Bug Analyzer",
    description:
      "Analyzes bug reports: identifies root causes, suggests fixes, finds related past interactions where similar issues were discussed.",
    system_prompt: `You are a bug analysis specialist for the MAL platform. When given a bug report, systematically analyze it and provide insights.

## Analysis Process
1. **Reproduce**: Understand the steps to reproduce from the description
2. **Root Cause**: Use code search and past interactions to identify the likely root cause
3. **Related Issues**: Search past interactions for similar bugs or discussions
4. **Impact**: Assess severity and blast radius
5. **Fix Suggestion**: Propose a specific fix with code changes

## Tools Usage
- mal_search_catalog: Find relevant skills/patterns that might help
- mal_search_interactions: Look for past discussions about similar issues
- mal_get_command: Check if there's a diagnostic command available

## Output Format
### Bug Analysis: [Title]
**Severity**: critical / high / medium / low
**Component**: [affected component]

#### Root Cause
[Explanation of why the bug occurs]

#### Related Discussions
[Links to past interactions where similar issues were discussed]

#### Suggested Fix
\`\`\`
[Code or steps to fix]
\`\`\`

#### Prevention
[How to prevent similar bugs in the future]`,
    model: "claude-sonnet-4-5-20250929",
    tools_allowed: JSON.stringify([
      "mal_search_catalog",
      "mal_search_interactions",
      "mal_get_command",
    ]),
    max_turns: 8,
    input_schema: JSON.stringify({
      type: "object",
      properties: {
        title: { type: "string", description: "Bug title" },
        description: {
          type: "string",
          description: "Bug description with reproduction steps",
        },
        error_message: {
          type: "string",
          description: "Error message or stack trace",
        },
        component: {
          type: "string",
          description: "Affected component (on-premise, nube, frontend, backend)",
        },
      },
      required: ["title", "description"],
    }),
    output_format: "markdown",
    author: "MAL Team",
    tags: JSON.stringify(["bug", "analysis", "debugging"]),
  },
  {
    id: "test-generator",
    name: "Test Generator",
    description:
      "Generates test cases (vitest for TS, pytest for Python). Covers happy paths, edge cases, error scenarios. References testing patterns from skills catalog.",
    system_prompt: `You are a test generation specialist for the MAL platform. Generate comprehensive test suites for code changes.

## Testing Frameworks
- **TypeScript**: vitest (unit + integration)
- **Python**: pytest with pytest-asyncio for async tests

## Test Structure (vitest)
\`\`\`typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ComponentName", () => {
  beforeEach(() => { /* setup */ });

  it("should handle happy path", () => { /* test */ });
  it("should handle empty input", () => { /* test */ });
  it("should handle error case", () => { /* test */ });
});
\`\`\`

## Test Structure (pytest)
\`\`\`python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_happy_path():
    # Arrange, Act, Assert
    pass

def test_edge_case():
    pass
\`\`\`

## Coverage Goals
1. **Happy path**: Normal successful operation
2. **Edge cases**: Empty input, null/undefined, boundary values, large inputs
3. **Error scenarios**: Invalid input, network failures, database errors
4. **Integration**: End-to-end flow through multiple layers

## MAL-Specific Patterns
- Mock IDatabase with vi.fn() for tool tests
- Mock McpServer.registerTool to verify tool registration
- Use in-memory SQLite for adapter tests
- Test pagination (offset, limit, has_more)

Use mal_search_catalog and mal_get_skill_content to find existing test patterns.`,
    model: "claude-sonnet-4-5-20250929",
    tools_allowed: JSON.stringify([
      "mal_search_catalog",
      "mal_get_skill_content",
      "mal_get_command",
    ]),
    max_turns: 10,
    input_schema: JSON.stringify({
      type: "object",
      properties: {
        code: { type: "string", description: "Code to generate tests for" },
        language: {
          type: "string",
          enum: ["typescript", "python"],
          description: "Programming language",
        },
        test_type: {
          type: "string",
          enum: ["unit", "integration", "e2e"],
          description: "Type of tests to generate",
        },
      },
      required: ["code", "language"],
    }),
    output_format: "markdown",
    author: "MAL Team",
    tags: JSON.stringify(["testing", "vitest", "pytest", "quality"]),
  },
];

// ============================================================
// 5. ACHIEVEMENTS (14)
// ============================================================

const achievements = [
  {
    id: "first-commit",
    name: "First Commit",
    description: "Make your first commit to the project",
    icon: "\u{1F3D7}\u{FE0F}",
    category: "code",
    tier: "bronze",
    xp_reward: 10,
    criteria: JSON.stringify({ type: "commit", count: 1 }),
  },
  {
    id: "ten-commits",
    name: "Consistent Coder",
    description: "Log 10 commits to the project",
    icon: "\u{1F4BB}",
    category: "code",
    tier: "silver",
    xp_reward: 25,
    criteria: JSON.stringify({ type: "commit", count: 10 }),
  },
  {
    id: "hundred-commits",
    name: "Code Machine",
    description: "Log 100 commits to the project",
    icon: "\u26A1",
    category: "code",
    tier: "gold",
    xp_reward: 50,
    criteria: JSON.stringify({ type: "commit", count: 100 }),
  },
  {
    id: "first-chat",
    name: "Conversationalist",
    description: "Log your first interaction with the AI assistant",
    icon: "\u{1F4AC}",
    category: "collaboration",
    tier: "bronze",
    xp_reward: 10,
    criteria: JSON.stringify({ type: "interaction", count: 1 }),
  },
  {
    id: "fifty-chats",
    name: "Knowledge Seeker",
    description: "Log 50 interactions — you're building institutional memory",
    icon: "\u{1F4DA}",
    category: "collaboration",
    tier: "silver",
    xp_reward: 25,
    criteria: JSON.stringify({ type: "interaction", count: 50 }),
  },
  {
    id: "tool-explorer",
    name: "Tool Explorer",
    description: "Use 10 different MCP tools across your interactions",
    icon: "\u{1F527}",
    category: "exploration",
    tier: "silver",
    xp_reward: 25,
    criteria: JSON.stringify({ type: "unique_tools", count: 10 }),
  },
  {
    id: "tool-master",
    name: "Tool Master",
    description: "Use all 42 MCP tools — you've mastered the entire catalog",
    icon: "\u{1F6E0}\u{FE0F}",
    category: "exploration",
    tier: "gold",
    xp_reward: 50,
    criteria: JSON.stringify({ type: "unique_tools", count: 42 }),
  },
  {
    id: "sprint-runner",
    name: "Sprint Runner",
    description: "Complete your first sprint with work items done",
    icon: "\u{1F3C3}",
    category: "agile",
    tier: "bronze",
    xp_reward: 10,
    criteria: JSON.stringify({ type: "sprint_completed", count: 1 }),
  },
  {
    id: "sprint-champion",
    name: "Sprint Champion",
    description: "Lead team velocity for 3 consecutive sprints",
    icon: "\u{1F3C6}",
    category: "agile",
    tier: "gold",
    xp_reward: 50,
    criteria: JSON.stringify({ type: "sprint_top_velocity", count: 3 }),
  },
  {
    id: "bug-slayer",
    name: "Bug Slayer",
    description: "Close 10 bugs — the codebase thanks you",
    icon: "\u{1F41B}",
    category: "code",
    tier: "silver",
    xp_reward: 25,
    criteria: JSON.stringify({ type: "bug_closed", count: 10 }),
  },
  {
    id: "on-fire",
    name: "On Fire",
    description: "Maintain a 7-day contribution streak",
    icon: "\u{1F525}",
    category: "mastery",
    tier: "gold",
    xp_reward: 50,
    criteria: JSON.stringify({ type: "streak_days", count: 7 }),
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Maintain a 30-day contribution streak — legendary dedication",
    icon: "\u{1F48E}",
    category: "mastery",
    tier: "platinum",
    xp_reward: 100,
    criteria: JSON.stringify({ type: "streak_days", count: 30 }),
  },
  {
    id: "decision-maker",
    name: "Decision Maker",
    description: "Have 20 key decisions extracted from your interactions",
    icon: "\u{1F3AF}",
    category: "collaboration",
    tier: "silver",
    xp_reward: 25,
    criteria: JSON.stringify({ type: "decisions_logged", count: 20 }),
  },
  {
    id: "architect",
    name: "Architect",
    description: "Reach Level 20 — you've shaped the entire platform",
    icon: "\u{1F451}",
    category: "mastery",
    tier: "platinum",
    xp_reward: 100,
    criteria: JSON.stringify({ type: "level_reached", count: 20 }),
  },
];

// ============================================================
// SEED FUNCTION
// ============================================================

function seed() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  let skillCount = 0;
  let commandCount = 0;
  let subagentCount = 0;
  let mcpCount = 0;
  let achievementCount = 0;

  // --- Seed MCPs ---
  const insertMCP = db.prepare(`
    INSERT OR IGNORE INTO mcps (id, name, description, transport, endpoint_url, command, args, env_vars, health_check_url, status, tools_exposed, author)
    VALUES (@id, @name, @description, @transport, @endpoint_url, @command, @args, @env_vars, @health_check_url, @status, @tools_exposed, @author)
  `);
  const insertMCPFTS = db.prepare(
    `INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`
  );

  for (const mcp of mcps) {
    const result = insertMCP.run(mcp);
    if (result.changes > 0) {
      insertMCPFTS.run(mcp.id, mcp.name, mcp.description, "[]", "mcps");
      mcpCount++;
    }
  }

  // --- Seed Skills (with SKILL.md assets) ---
  const insertSkill = db.prepare(`
    INSERT OR IGNORE INTO skills (id, name, description, version, category, trigger_patterns, asset_path, dependencies, author, tags)
    VALUES (@id, @name, @description, @version, @category, @trigger_patterns, @asset_path, @dependencies, @author, @tags)
  `);
  const insertSkillFTS = db.prepare(
    `INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`
  );

  for (const skill of skills) {
    const { skill_md, ...skillData } = skill;
    const result = insertSkill.run(skillData);
    if (result.changes > 0) {
      insertSkillFTS.run(
        skillData.id,
        skillData.name,
        skillData.description,
        skillData.tags,
        "skills"
      );
      skillCount++;

      // Write SKILL.md asset file
      const assetFullPath = join(ASSETS_PATH, skillData.asset_path);
      const assetDir = dirname(assetFullPath);
      mkdirSync(assetDir, { recursive: true });
      writeFileSync(assetFullPath, skill_md, "utf-8");
    }
  }

  // --- Seed Commands ---
  const insertCommand = db.prepare(`
    INSERT OR IGNORE INTO commands (id, name, description, category, shell, script_template, parameters, requires_confirmation, author, tags)
    VALUES (@id, @name, @description, @category, @shell, @script_template, @parameters, @requires_confirmation, @author, @tags)
  `);
  const insertCommandFTS = db.prepare(
    `INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`
  );

  for (const command of commands) {
    const result = insertCommand.run(command);
    if (result.changes > 0) {
      insertCommandFTS.run(
        command.id,
        command.name,
        command.description,
        command.tags,
        "commands"
      );
      commandCount++;
    }
  }

  // --- Seed Subagents ---
  const insertSubagent = db.prepare(`
    INSERT OR IGNORE INTO subagents (id, name, description, system_prompt, model, tools_allowed, max_turns, input_schema, output_format, author, tags)
    VALUES (@id, @name, @description, @system_prompt, @model, @tools_allowed, @max_turns, @input_schema, @output_format, @author, @tags)
  `);
  const insertSubagentFTS = db.prepare(
    `INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`
  );

  for (const subagent of subagents) {
    const result = insertSubagent.run(subagent);
    if (result.changes > 0) {
      insertSubagentFTS.run(
        subagent.id,
        subagent.name,
        subagent.description,
        subagent.tags,
        "subagents"
      );
      subagentCount++;
    }
  }

  // --- Seed Achievements ---
  const insertAchievement = db.prepare(`
    INSERT OR IGNORE INTO achievements (id, name, description, icon, category, tier, xp_reward, criteria)
    VALUES (@id, @name, @description, @icon, @category, @tier, @xp_reward, @criteria)
  `);

  for (const achievement of achievements) {
    const result = insertAchievement.run(achievement);
    if (result.changes > 0) {
      achievementCount++;
    }
  }

  // --- Seed Project: Bella Italia ---
  let projectCount = 0;
  const insertProject = db.prepare(`
    INSERT OR IGNORE INTO projects (id, name, description, status, owner_id, color, metadata)
    VALUES (@id, @name, @description, @status, @owner_id, @color, @metadata)
  `);

  const projectResult = insertProject.run({
    id: "bella-italia",
    name: "Bella Italia",
    description: "Restaurant website MVP — menu, reservations, online ordering",
    status: "active",
    owner_id: "jorge",
    color: "green",
    metadata: JSON.stringify({}),
  });
  if (projectResult.changes > 0) projectCount++;

  // Migrate existing sprints and work items to the Bella Italia project
  const updateSprintsProject = db.prepare(
    `UPDATE sprints SET project_id = 'bella-italia' WHERE id LIKE 'bella-%' AND project_id IS NULL`
  );
  const updateWorkItemsProject = db.prepare(
    `UPDATE work_items SET project_id = 'bella-italia' WHERE id LIKE 'BI-%' AND project_id IS NULL`
  );
  const sprintsUpdated = updateSprintsProject.run();
  const workItemsUpdated = updateWorkItemsProject.run();

  db.close();

  const total =
    mcpCount + skillCount + commandCount + subagentCount + achievementCount + projectCount;
  console.log(
    `\nSeed complete! ${total} new entries added:`
  );
  console.log(`  ${mcpCount} MCPs`);
  console.log(`  ${skillCount} skills (with SKILL.md assets)`);
  console.log(`  ${commandCount} commands`);
  console.log(`  ${subagentCount} subagents`);
  console.log(`  ${achievementCount} achievements`);
  console.log(`  ${projectCount} projects`);
  if (sprintsUpdated.changes > 0 || workItemsUpdated.changes > 0) {
    console.log(`  Migrated ${sprintsUpdated.changes} sprint(s) + ${workItemsUpdated.changes} work item(s) to project 'bella-italia'`);
  }

  if (total === 0) {
    console.log("\n(All entries already existed — no duplicates added)");
  }
}

seed();
