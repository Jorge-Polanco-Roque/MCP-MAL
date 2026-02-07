import { Firestore } from "@google-cloud/firestore";

const PROJECT_ID = process.env.FIRESTORE_PROJECT || process.env.GCP_PROJECT_ID;
if (!PROJECT_ID) {
  console.error("Error: Set FIRESTORE_PROJECT or GCP_PROJECT_ID env var");
  process.exit(1);
}

const firestore = new Firestore({
  projectId: PROJECT_ID,
  databaseId: "mal-catalog",
});

function generateSearchTokens(obj: Record<string, unknown>): string[] {
  const parts: string[] = [];
  if (typeof obj.name === "string") parts.push(obj.name);
  if (typeof obj.description === "string") parts.push(obj.description);
  if (typeof obj.id === "string") parts.push(obj.id);
  if (Array.isArray(obj.tags)) parts.push(...obj.tags.map(String));
  const tokens = parts.join(" ").toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  return [...new Set(tokens)];
}

const seedData = {
  skills: [
    {
      id: "code-review",
      name: "Code Review",
      description: "Automated code review with best practices analysis",
      version: "1.0.0",
      category: "devops",
      trigger_patterns: ["review", "code review", "PR review"],
      asset_path: "skills/code-review/SKILL.md",
      dependencies: [],
      author: "MAL Team",
      tags: ["review", "quality", "devops"],
    },
    {
      id: "api-docs-generator",
      name: "API Docs Generator",
      description: "Generate API documentation from source code",
      version: "1.0.0",
      category: "document",
      trigger_patterns: ["api docs", "documentation", "swagger"],
      asset_path: "skills/api-docs-generator/SKILL.md",
      dependencies: [],
      author: "MAL Team",
      tags: ["documentation", "api", "openapi"],
    },
  ],
  commands: [
    {
      id: "deploy-docker",
      name: "Deploy with Docker",
      description: "Build and deploy a Docker container",
      category: "devops",
      shell: "bash",
      script_template: "docker build -t {{image_name}}:{{tag}} . && docker run -d -p {{port}}:{{container_port}} {{image_name}}:{{tag}}",
      parameters: [
        { name: "image_name", type: "string", description: "Docker image name", required: true },
        { name: "tag", type: "string", description: "Image tag", required: false, default: "latest" },
        { name: "port", type: "number", description: "Host port", required: true },
        { name: "container_port", type: "number", description: "Container port", required: true },
      ],
      requires_confirmation: true,
      author: "MAL Team",
      tags: ["docker", "deploy", "devops"],
    },
    {
      id: "git-clean-branches",
      name: "Clean Git Branches",
      description: "Delete merged local branches except main/master/develop",
      category: "git",
      shell: "bash",
      script_template: "git branch --merged | grep -vE '(main|master|develop|\\*)' | xargs -r git branch -d",
      parameters: [],
      requires_confirmation: true,
      author: "MAL Team",
      tags: ["git", "cleanup"],
    },
  ],
  subagents: [
    {
      id: "code-reviewer",
      name: "Code Reviewer Agent",
      description: "AI agent specialized in code review and quality analysis",
      system_prompt: "You are a senior code reviewer. Analyze code for bugs, security issues, performance problems, and adherence to best practices. Provide actionable feedback.",
      model: "claude-sonnet-4-5-20250929",
      tools_allowed: ["read_file", "search_code"],
      max_turns: 5,
      input_schema: { code: "string", language: "string" },
      output_format: "markdown",
      author: "MAL Team",
      tags: ["review", "quality"],
    },
  ],
  mcps: [
    {
      id: "context7",
      name: "Context7",
      description: "Up-to-date documentation and code examples for any library",
      transport: "streamable-http",
      endpoint_url: "https://mcp.context7.com/mcp",
      args: [],
      env_vars: {},
      status: "active",
      tools_exposed: ["resolve-library-id", "query-docs"],
      author: "MAL Team",
    },
  ],
};

async function seed() {
  const now = new Date().toISOString();

  for (const [collection, items] of Object.entries(seedData)) {
    for (const item of items) {
      const data = {
        ...item,
        search_tokens: generateSearchTokens(item as Record<string, unknown>),
        created_at: now,
        updated_at: now,
      };

      const docRef = firestore.collection(collection).doc(item.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        await docRef.set(data);
        console.log(`[${collection}] Created: ${item.id}`);
      } else {
        console.log(`[${collection}] Skipped (exists): ${item.id}`);
      }
    }
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
