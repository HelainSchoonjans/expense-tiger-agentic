---
name: tdd
version: 2026-03-29-18:30-v0.1.0
changelog:
  - 2026-03-29 18:30 v0.1.0 — Initial versioned release.
description: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
---

# Test-Driven Development

## Philosophy

**Core principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe _what_ the system does, not _how_ it does it. A good test reads like a specification - "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed. If you rename an internal function and tests fail, those tests were testing implementation, not behavior.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" - treating RED as "write all tests" and GREEN as "write all code."

This produces **crap tests**:

- Tests written in bulk test _imagined_ behavior, not _actual_ behavior
- You end up testing the _shape_ of things (data structures, function signatures) rather than user-facing behavior
- Tests become insensitive to real changes - they pass when behavior breaks, fail when behavior is fine
- You outrun your headlights, committing to test structure before understanding the implementation

**Correct approach**: Vertical slices via tracer bullets. One test → one implementation → repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behavior matters and how to verify it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

## Workflow

### 1. Planning

Before writing any code:

- [ ] Confirm with user what interface changes are needed
- [ ] Confirm with user which behaviors to test (prioritize)
- [ ] Identify opportunities for [deep modules](deep-modules.md) (small interface, deep implementation)
- [ ] Design interfaces for [testability](interface-design.md)
- [ ] List the behaviors to test (not implementation steps)
- [ ] Get user approval on the plan

Ask: "What should the public interface look like? Which behaviors are most important to test?"

**You can't test everything.** Confirm with the user exactly which behaviors matter most. Focus testing effort on critical paths and complex logic, not every possible edge case.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This is your tracer bullet - proves the path works end-to-end.

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:

- One test at a time
- Only enough code to pass current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### 4. Refactor

After all tests pass, look for [refactor candidates](refactoring.md):

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID principles where natural
- [ ] Consider what new code reveals about existing code
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

## Serverless Integration Testing

When building serverless applications, TDD extends beyond unit tests to include integration tests against deployed AWS services. The same red-green-refactor principles apply, but the "test" step verifies behavior against real infrastructure.

### Backend Integration Tests (Post-Deploy)

After CDK deployment, the backend agent runs integration tests to verify services work end-to-end. These use the AWS CLI and API tools — not mocks.

**What to test:**
- Stack outputs exist and are non-empty (ApiEndpoint, UserPoolId, etc.)
- Cognito can create/authenticate a test user
- API Gateway returns proper CORS headers on OPTIONS requests
- API Gateway returns 401 for unauthenticated requests
- Each API endpoint accepts valid input and returns expected output
- CloudWatch log groups exist and contain entries after invocation

**Self-healing loop:**
```
Test fails → Read CloudWatch logs → Identify root cause → Fix code/config → Redeploy → Retest
```

The agent uses `aws logs filter-log-events` to read structured JSON logs from Lambda. This is why structured logging (JSON format) with request context (request_id, user_id, http_method, path) is critical — it makes automated diagnosis possible.

### Frontend E2E Tests (Post-Deploy)

The frontend agent uses Playwright or Chrome DevTools MCP tools to verify UI behavior against the deployed application in a real browser.

**What to test:**
- Auth gate renders when no session exists
- Sign-up, verification, and sign-in flows complete successfully
- Receipt upload accepts valid images and shows preview
- Expense editor displays editable fields after extraction
- Accept button saves expense and navigates to list
- Expense list displays previously accepted expenses
- Form validation prevents submission with empty required fields

**Tooling:** Chrome DevTools MCP (take_snapshot, click, fill, navigate_page) or Playwright MCP (browser_snapshot, browser_click, browser_type, browser_navigate).

### Contract-Based Parallel Development

When frontend and backend agents work in parallel, they share an API contract that defines:
- Endpoint paths, methods, and auth requirements
- Request/response JSON schemas
- Error response format
- CORS header expectations

Each agent tests against this contract independently:
- **Backend agent**: Deploys infrastructure, runs integration tests against real endpoints
- **Frontend agent**: Builds UI, runs E2E tests against the deployed backend

The contract is the boundary. Neither agent needs to understand the other's implementation.
