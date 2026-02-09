# Root Cause Tracing

Systematically trace bugs backward through the call stack to find the original trigger. Fix at the source, not at the symptom.

**Core principle:** Trace backward through the call chain until you find the original trigger, then fix there.

Adapted from [NeoLabHQ/context-engineering-kit](https://github.com/NeoLabHQ/context-engineering-kit).

## When to Use

- Error happens deep in execution (not at entry point)
- Stack trace shows long call chain
- Unclear where invalid data originated
- Need to find which test/code triggers the problem

## The Tracing Process

### 1. Observe the Symptom

```
Error: SQLITE_CONSTRAINT: NOT NULL constraint failed: contributions.updated_at
```

### 2. Find Immediate Cause

What code directly causes this?

```typescript
await db.create("contributions", "", { user_id, type, points });
```

### 3. Ask: What Called This?

```typescript
mal_log_contribution(args)
  → db.create("contributions", "", data)
  → INSERT INTO contributions (...) VALUES (...)
  → SQLite constraint fails
```

### 4. Keep Tracing Up

What value was wrong?

- `id = ""` (empty string for AUTOINCREMENT table)
- `SQLiteAdapter.create()` inserts `id: ""` into INTEGER column
- That's the source!

### 5. Find Original Trigger

Where did the problem originate?

```typescript
// SQLiteAdapter.create() always set obj.id = id
// But for AUTOINCREMENT tables, id should be omitted
```

### 6. Fix at Source + Defense in Depth

```typescript
// Fix: Only set id when truthy
if (id) obj.id = id;

// Defense: Filter empty id from INSERT
const keys = Object.keys(obj).filter(k => k !== "id" || obj.id);
```

## Adding Stack Traces

When you can't trace manually:

```typescript
async function riskyOperation(directory: string) {
  const stack = new Error().stack;
  console.error("DEBUG riskyOperation:", {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... operation
}
```

**Tips:**
- Use `console.error()` in tests (logger may be suppressed)
- Log BEFORE the dangerous operation, not after it fails
- Include context: directory, cwd, env vars, timestamps
- `new Error().stack` shows complete call chain

## Real MAL Examples

### Example 1: contributions table missing updated_at

**Symptom:** `NOT NULL constraint failed: contributions.updated_at`

**Trace:**
1. `db.create()` adds `updated_at` automatically
2. But `contributions` table schema didn't have `updated_at` column
3. SQLite silently ignored the extra column until strict mode

**Fix:** Added `updated_at TEXT NOT NULL DEFAULT (datetime('now'))` to schema.

### Example 2: user_achievements ORDER BY failure

**Symptom:** `no such column: updated_at` when listing achievements

**Trace:**
1. `db.list()` defaults to `ORDER BY updated_at DESC`
2. `user_achievements` table has `unlocked_at`, not `updated_at`
3. Caller didn't specify `order_by`

**Fix:** All `db.list()` calls on `user_achievements` now pass `order_by: "unlocked_at"`.

### Example 3: Command injection in analytics

**Symptom:** Security audit flagged `execSync()` with string interpolation

**Trace:**
1. `mal_get_commit_activity` used `execSync(\`git log ... --author="${author}"\`)`
2. `author` comes from user input (MCP tool argument)
3. Crafted author string could inject shell commands

**Fix:** Replaced with `execFileSync("git", [...args])` — argument arrays prevent injection.

## Key Principle

**NEVER fix just where the error appears.** Trace back to find the original trigger.

After finding root cause:
1. Fix at the source
2. Add validation at each layer (defense in depth)
3. Add tests to prevent regression

## Stack Trace Tips

| Situation | Approach |
|-----------|----------|
| Test pollution | Bisect: run tests one-by-one |
| Deep call chain | Add `new Error().stack` logging |
| Intermittent bug | Add timestamps + context to logs |
| Multi-component | Log at each component boundary |
