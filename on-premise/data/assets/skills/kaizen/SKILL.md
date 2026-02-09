# Kaizen: Continuous Improvement

Small improvements, continuously. Error-proof by design. Follow what works. Build only what's needed.

**Core principle:** Many small improvements beat one big change. Prevent errors at design time, not with fixes.

Adapted from [NeoLabHQ/context-engineering-kit](https://github.com/NeoLabHQ/context-engineering-kit).

## When to Use

Always applied for:
- Code implementation and refactoring
- Architecture and design decisions
- Process and workflow improvements
- Error handling and validation

## The Four Pillars

### 1. Continuous Improvement (Kaizen)

Small, frequent improvements compound into major gains.

**Iterative refinement:**

```typescript
// Iteration 1: Make it work
const calculateTotal = (items: Item[]) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
};

// Iteration 2: Make it clear
const calculateTotal = (items: Item[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

// Iteration 3: Make it robust
const calculateTotal = (items: Item[]): number => {
  if (!items?.length) return 0;
  return items.reduce((total, item) => {
    if (item.price < 0 || item.quantity < 0) {
      throw new Error("Price and quantity must be non-negative");
    }
    return total + item.price * item.quantity;
  }, 0);
};
```

Each step is complete, tested, and working.

**In practice:**
- Start with simplest version that works
- Add one improvement at a time
- Test and verify each change
- Stop when "good enough" (diminishing returns)

### 2. Poka-Yoke (Error Proofing)

Design systems that prevent errors at compile/design time.

**Type system error proofing:**

```typescript
// Bad: string status can be anything
type Order = { status: string; total: number };

// Good: Only valid states possible
type OrderStatus = "pending" | "processing" | "shipped" | "delivered";
type Order = { status: OrderStatus; total: number };

// Better: States with associated data
type Order =
  | { status: "pending"; createdAt: Date }
  | { status: "processing"; startedAt: Date }
  | { status: "shipped"; trackingNumber: string; shippedAt: Date }
  | { status: "delivered"; deliveredAt: Date; signature: string };
// Impossible to have shipped without trackingNumber
```

**Validate at boundaries:**

```typescript
// Validate once at system boundary, safe everywhere else
type PositiveNumber = number & { readonly __brand: "PositiveNumber" };

const validatePositive = (n: number): PositiveNumber => {
  if (n <= 0) throw new Error("Must be positive");
  return n as PositiveNumber;
};

const processPayment = (amount: PositiveNumber) => {
  // amount is guaranteed positive, no need to check
  const fee = amount * 0.03;
};
```

**Configuration error proofing:**

```typescript
// Fail at startup, not in production
const loadConfig = (): Config => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable required");
  }
  return { apiKey, timeout: 5000 };
};
```

### 3. Standardized Work

Follow established patterns. Consistency over cleverness.

**MAL conventions:**
- Tool names: `mal_{action}_{resource}`
- Files: kebab-case
- Interfaces: PascalCase
- Error responses: `{ isError: true, content: [{ type: "text", text: "Error: ..." }] }`
- MCP responses: markdown with structured pagination

**Before adding new patterns:**
- Search codebase for similar solved problems
- Check CLAUDE.md for project conventions
- Discuss with team if breaking from pattern
- Update docs when introducing new pattern

### 4. Just-In-Time (JIT)

Build what's needed now. No more, no less.

**YAGNI in action:**

```typescript
// Good: meets current need
const logError = (error: Error) => {
  console.error(error.message);
};

// Bad: over-engineered for imaginary future
class Logger {
  private transports: LogTransport[] = [];
  private queue: LogEntry[] = [];
  private rateLimiter: RateLimiter;
  // 200 lines of code for "maybe we'll need it"
}
```

**When to add complexity:**
- Current requirement demands it
- Pain points identified through use
- Measured performance issues
- 3+ similar cases emerged (Rule of Three)

**Premature abstraction:**

```typescript
// Bad: One use case, building entire framework
abstract class BaseCRUDService<T> { /* 300 lines */ }

// Good: Simple functions for current needs
const getUsers = async (): Promise<User[]> => {
  return db.query("SELECT * FROM users");
};
// Abstract only when pattern proven across 3+ cases
```

## Red Flags

| Pillar | Red Flag |
|--------|----------|
| Continuous Improvement | "I'll refactor it later" (never happens) |
| Poka-Yoke | "Users should just be careful" |
| Standardized Work | "I prefer to do it my way" |
| Just-In-Time | "We might need this someday" |

## Remember

**Kaizen is about:** Small improvements continuously, preventing errors by design, following proven patterns, building only what's needed.

**Not about:** Perfection on first try, massive refactoring projects, clever abstractions, premature optimization.

**Mindset:** Good enough today, better tomorrow. Repeat.
