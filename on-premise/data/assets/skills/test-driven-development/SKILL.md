# Test-Driven Development (TDD)

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

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over. No exceptions.

## Red-Green-Refactor

### RED — Write Failing Test

Write one minimal test showing what should happen.

```typescript
// vitest (MAL convention)
import { describe, it, expect } from "vitest";

it("retries failed operations 3 times", async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error("fail");
    return "success";
  };

  const result = await retryOperation(operation);

  expect(result).toBe("success");
  expect(attempts).toBe(3);
});
```

Requirements:
- One behavior per test
- Clear descriptive name
- Real code (no mocks unless unavoidable)

### Verify RED — Watch It Fail

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

### GREEN — Minimal Code

Write simplest code to pass the test.

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error("unreachable");
}
```

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN — Watch It Pass

```bash
npm test path/to/test.test.ts
```

Confirm: test passes, other tests still pass, output pristine.

### REFACTOR — Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

## MAL-Specific Patterns

### MCP Tool Tests (vitest)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("mal_list_skills", () => {
  const mockDb = { list: vi.fn(), search: vi.fn() };

  beforeEach(() => { vi.clearAllMocks(); });

  it("should return paginated skills with markdown", async () => {
    mockDb.list.mockResolvedValue({
      items: [{ id: "tdd", name: "TDD", category: "custom" }],
      total: 1,
    });

    // Call tool handler with mockDb
    // Assert markdown output contains skill name
  });
});
```

### Python Agent Tests (pytest)

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_chat_agent_compiles():
    """Agent graph should compile without errors."""
    from app.agent.graph import build_graph
    graph = build_graph(tools=[])
    assert graph is not None
```

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = bad tests" | Hard to test = hard to use. Listen to the test. |

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

## Bug Fix Example

**Bug:** Empty email accepted

```typescript
// RED
it("rejects empty email", async () => {
  const result = await submitForm({ email: "" });
  expect(result.error).toBe("Email required");
});

// GREEN
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: "Email required" };
  }
  // ...
}
```

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |
