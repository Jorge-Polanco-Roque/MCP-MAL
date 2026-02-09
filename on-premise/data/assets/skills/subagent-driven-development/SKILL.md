# Subagent-Driven Development

Create and execute plans by dispatching fresh subagents per task, with code review between tasks.

**Core principle:** Fresh subagent per task + review between tasks = high quality, fast iteration.

Adapted from [obra/superpowers](https://github.com/obra/superpowers).

## When to Use

- Executing implementation plans with independent tasks
- Facing 3+ independent issues that can be investigated in parallel
- Complex multi-step tasks where context pollution is a concern

## Execution Modes

### Sequential Execution

When tasks are tightly coupled and must be executed in order.

**Process:**

1. **Load plan**, create task list
2. **Dispatch fresh subagent** per task:

```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-file].
    1. Implement exactly what the task specifies
    2. Write tests
    3. Verify implementation works
    4. Report: what you implemented, tested, files changed, issues
```

3. **Review subagent's work** (dispatch code-reviewer subagent)
4. **Apply review feedback** — fix Critical issues immediately
5. **Mark complete, next task**
6. **Final review** after all tasks complete

### Parallel Execution

When tasks are mostly independent (different files, different subsystems).

**Process:**

1. Load plan, review critically, identify questions
2. Execute tasks in batches (default: first 3)
3. Report between batches — show what was implemented + verification output
4. Continue based on feedback
5. Complete when all tasks verified

### Parallel Investigation

Special case for multiple unrelated failures.

**Process:**

1. **Group failures by domain** (e.g., File A tests, File B tests, File C tests)
2. **Dispatch one agent per domain** with focused scope
3. **Run concurrently** — all three in parallel
4. **Review and integrate** — check for conflicts, run full suite

## MAL Integration

### Using Claude Code Task Tool

```
// Sequential: one at a time
Task("Implement mal_create_project tool in projects.ts")
  → wait for result
  → review
Task("Add project tests in projects.test.ts")
  → wait for result
  → review

// Parallel: independent tasks
Task("Fix analytics.ts command injection")
Task("Fix auth.ts timing attack")
Task("Fix data.py async subprocess")
  → all three run concurrently
  → review all results together
```

### Agent Prompt Structure

Good agent prompts are:

1. **Focused** — One clear problem domain
2. **Self-contained** — All context needed
3. **Specific about output** — What should the agent return?

```markdown
Fix the 3 failing tests in src/tools/registry.test.ts:

1. "should register skill" - expects skill object returned
2. "should list skills with filter" - pagination broken

These are likely schema validation issues. Your task:
1. Read the test file and understand each test
2. Identify root cause
3. Fix the issue
4. Run tests to verify

Do NOT change production code unless the bug is there.

Return: Summary of root cause and changes made.
```

### Common Mistakes

- **Too broad**: "Fix all the tests" — agent gets lost
- **No context**: "Fix the race condition" — agent doesn't know where
- **No constraints**: Agent might refactor everything
- **Vague output**: "Fix it" — you don't know what changed

### When NOT to Use

- **Related failures**: Fixing one might fix others — investigate together first
- **Need full context**: Understanding requires seeing entire system
- **Shared state**: Agents would interfere (editing same files)
- **Exploratory debugging**: You don't know what's broken yet

## Red Flags

- Skip code review between tasks
- Proceed with unfixed Critical issues
- Dispatch multiple implementation subagents editing same files in parallel
- Implement without reading plan task
- Try to fix manually after subagent fails (context pollution)

## Key Benefit

Each subagent starts with a clean context — no accumulated confusion from previous tasks. Combined with review checkpoints, this catches issues early while maintaining fast iteration speed.
