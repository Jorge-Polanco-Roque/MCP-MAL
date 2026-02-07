import Database from "better-sqlite3";
import { readFileSync } from "fs";

const DB_PATH = process.env.SQLITE_PATH || "./data/catalog.db";

const seedData = {
  skills: [
    {
      id: "code-review",
      name: "Code Review",
      description: "Automated code review with best practices analysis",
      version: "1.0.0",
      category: "devops",
      trigger_patterns: JSON.stringify(["review", "code review", "PR review"]),
      asset_path: "skills/code-review/SKILL.md",
      dependencies: JSON.stringify([]),
      author: "MAL Team",
      tags: JSON.stringify(["review", "quality", "devops"]),
    },
    {
      id: "api-docs-generator",
      name: "API Docs Generator",
      description: "Generate API documentation from source code",
      version: "1.0.0",
      category: "document",
      trigger_patterns: JSON.stringify(["api docs", "documentation", "swagger"]),
      asset_path: "skills/api-docs-generator/SKILL.md",
      dependencies: JSON.stringify([]),
      author: "MAL Team",
      tags: JSON.stringify(["documentation", "api", "openapi"]),
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
      parameters: JSON.stringify([
        { name: "image_name", type: "string", description: "Docker image name", required: true },
        { name: "tag", type: "string", description: "Image tag", required: false, default: "latest" },
        { name: "port", type: "number", description: "Host port", required: true },
        { name: "container_port", type: "number", description: "Container port", required: true },
      ]),
      requires_confirmation: 1,
      author: "MAL Team",
      tags: JSON.stringify(["docker", "deploy", "devops"]),
    },
    {
      id: "git-clean-branches",
      name: "Clean Git Branches",
      description: "Delete merged local branches except main/master/develop",
      category: "git",
      shell: "bash",
      script_template: "git branch --merged | grep -vE '(main|master|develop|\\*)' | xargs -r git branch -d",
      parameters: JSON.stringify([]),
      requires_confirmation: 1,
      author: "MAL Team",
      tags: JSON.stringify(["git", "cleanup"]),
    },
  ],
  subagents: [
    {
      id: "code-reviewer",
      name: "Code Reviewer Agent",
      description: "AI agent specialized in code review and quality analysis",
      system_prompt: "You are a senior code reviewer. Analyze code for bugs, security issues, performance problems, and adherence to best practices. Provide actionable feedback.",
      model: "claude-sonnet-4-5-20250929",
      tools_allowed: JSON.stringify(["read_file", "search_code"]),
      max_turns: 5,
      input_schema: JSON.stringify({ code: "string", language: "string" }),
      output_format: "markdown",
      author: "MAL Team",
      tags: JSON.stringify(["review", "quality"]),
    },
  ],
  mcps: [
    {
      id: "context7",
      name: "Context7",
      description: "Up-to-date documentation and code examples for any library",
      transport: "streamable-http",
      endpoint_url: "https://mcp.context7.com/mcp",
      args: JSON.stringify([]),
      env_vars: JSON.stringify({}),
      status: "active",
      tools_exposed: JSON.stringify(["resolve-library-id", "query-docs"]),
      author: "MAL Team",
    },
  ],
};

function seed() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Seed skills
  const insertSkill = db.prepare(`
    INSERT OR IGNORE INTO skills (id, name, description, version, category, trigger_patterns, asset_path, dependencies, author, tags)
    VALUES (@id, @name, @description, @version, @category, @trigger_patterns, @asset_path, @dependencies, @author, @tags)
  `);

  for (const skill of seedData.skills) {
    insertSkill.run(skill);
  }
  console.log(`Seeded ${seedData.skills.length} skills`);

  // Seed commands
  const insertCommand = db.prepare(`
    INSERT OR IGNORE INTO commands (id, name, description, category, shell, script_template, parameters, requires_confirmation, author, tags)
    VALUES (@id, @name, @description, @category, @shell, @script_template, @parameters, @requires_confirmation, @author, @tags)
  `);

  for (const command of seedData.commands) {
    insertCommand.run(command);
  }
  console.log(`Seeded ${seedData.commands.length} commands`);

  // Seed subagents
  const insertSubagent = db.prepare(`
    INSERT OR IGNORE INTO subagents (id, name, description, system_prompt, model, tools_allowed, max_turns, input_schema, output_format, author, tags)
    VALUES (@id, @name, @description, @system_prompt, @model, @tools_allowed, @max_turns, @input_schema, @output_format, @author, @tags)
  `);

  for (const subagent of seedData.subagents) {
    insertSubagent.run(subagent);
  }
  console.log(`Seeded ${seedData.subagents.length} subagents`);

  // Seed MCPs
  const insertMCP = db.prepare(`
    INSERT OR IGNORE INTO mcps (id, name, description, transport, endpoint_url, args, env_vars, status, tools_exposed, author)
    VALUES (@id, @name, @description, @transport, @endpoint_url, @args, @env_vars, @status, @tools_exposed, @author)
  `);

  for (const mcp of seedData.mcps) {
    insertMCP.run(mcp);
  }
  console.log(`Seeded ${seedData.mcps.length} MCPs`);

  // Sync FTS index
  for (const skill of seedData.skills) {
    db.prepare(`INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`)
      .run(skill.id, skill.name, skill.description, skill.tags, "skills");
  }
  for (const command of seedData.commands) {
    db.prepare(`INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`)
      .run(command.id, command.name, command.description, command.tags, "commands");
  }
  for (const subagent of seedData.subagents) {
    db.prepare(`INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`)
      .run(subagent.id, subagent.name, subagent.description, subagent.tags, "subagents");
  }
  for (const mcp of seedData.mcps) {
    db.prepare(`INSERT OR IGNORE INTO catalog_fts (id, name, description, tags, collection) VALUES (?, ?, ?, ?, ?)`)
      .run(mcp.id, mcp.name, mcp.description, "[]", "mcps");
  }
  console.log("FTS index synced");

  db.close();
  console.log("Seed complete!");
}

seed();
