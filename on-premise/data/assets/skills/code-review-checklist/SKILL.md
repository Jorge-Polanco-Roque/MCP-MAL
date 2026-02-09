# Code Review Checklist

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
- [ ] No `any` types (use `unknown` with type guards)
- [ ] Strict null checks handled
- [ ] Interfaces used for data shapes
- [ ] Enums or const arrays for fixed sets

## Python Specific
- [ ] Type hints on function signatures
- [ ] Pydantic models for data validation
- [ ] Async/await used correctly (no blocking in async context)
- [ ] Context managers for resource cleanup
