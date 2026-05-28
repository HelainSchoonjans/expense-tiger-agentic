---
name: code-review
version: 2026-03-29-18:30-v0.1.0
changelog:
  - 2026-03-29 18:30 v0.1.0 — Initial versioned release.
description: Perform structured code reviews that adapt checks based on file type, enforce universal standards, and produce actionable findings.
---

# Code Review Skill

## Trigger
Use this skill when the user asks to review code, requests a code review, or wants feedback on code quality for any file in the workspace.

## Instructions

### Step 1 — Identify File Type

Read the target file and classify it as one of:

| Classification | Signals |
|---|---|
| React Component | `.tsx` / `.jsx` extension, imports from `react`, returns JSX |
| Lambda Handler | `exports.handler`, `event` + `context` parameters, AWS SDK imports |
| CDK Construct | Extends `Construct` or `Stack`, imports from `aws-cdk-lib` |
| Other | Anything that doesn't match the above — still apply universal checks |

If a file matches multiple categories, apply all relevant check sets.

### Step 2 — Run Type-Specific Checks

#### React Components
1. **TypeScript prop interfaces** — Every component must declare a `Props` interface or type. Inline object types in the function signature are a warning.
2. **Error boundaries** — Components that fetch data or render dynamic content should be wrapped in or include an error boundary.
3. **Accessibility** — Check for:
   - `aria-label` or `aria-labelledby` on interactive elements (`button`, `input`, `a`, custom clickable divs)
   - Semantic HTML (`nav`, `main`, `section`, `header`, `footer`) instead of generic `div` soup
   - `alt` text on `img` elements
   - Keyboard event handlers alongside mouse handlers (`onKeyDown` with `onClick`)
4. **Hook usage** — Hooks must be called at the top level (not inside conditions/loops). Custom hooks should start with `use`. Dependency arrays on `useEffect`/`useMemo`/`useCallback` must be complete.

#### Lambda Handlers
1. **Error handling** — The handler body must be wrapped in `try/catch`. Caught errors must be logged before re-throwing or returning an error response.
2. **Input validation** — `event` properties used in the handler should be validated or defaulted before use. Check for missing null/undefined guards.
3. **Logging** — The handler should log the incoming event (or a sanitized subset) at the start and the outcome at the end. Use structured logging (JSON) rather than plain `console.log` strings.
4. **AWS SDK v3** — Imports must use modular SDK v3 packages (`@aws-sdk/client-*`), not the monolithic `aws-sdk` v2. Clients should be instantiated outside the handler for connection reuse.

#### CDK Constructs
1. **Construct naming** — Construct IDs must be PascalCase and descriptive. Avoid generic names like `MyBucket` or `Resource1`.
2. **Removal policies** — Stateful resources (S3 buckets, DynamoDB tables, RDS instances, EFS file systems) must have an explicit `removalPolicy`. Flag if missing.
3. **Least-privilege IAM** — Flag `iam.PolicyStatement` with `actions: ['*']` or `resources: ['*']`. Permissions should be scoped to specific actions and resource ARNs.

### Step 3 — Universal Standards (all file types)

1. **No hardcoded secrets** — Flag strings that look like API keys, tokens, passwords, or AWS credentials. Suggest environment variables or secrets manager.
2. **Naming conventions** — Variables and functions: `camelCase`. Classes and interfaces: `PascalCase`. Constants: `UPPER_SNAKE_CASE`. File names: `kebab-case` or `PascalCase` for components.
3. **Comments on complex logic** — Any block longer than 10 lines with branching logic, regex, or bitwise operations should have a comment explaining intent.

### Step 4 — Generate Review Summary

Produce the review in this exact structure:

```
## Code Review: `<filename>`

**File type:** <classification>
**Reviewed:** <date>

### Critical Issues
Items that must be fixed before merge. Security vulnerabilities, crashes, data loss risks.

### Warnings
Items that should be fixed. Code smells, missing error handling, accessibility gaps.

### Suggestions
Nice-to-haves. Readability improvements, minor refactors, documentation.

### Passed Checks
Checks that the code already satisfies — acknowledge what's done well.
```

### Step 5 — Finding Format

Each finding must follow this format:

```
**[CATEGORY-NUMBER]** `filename:line` — <short title>
- **Issue:** What is wrong.
- **Why it matters:** Impact on reliability, security, accessibility, or maintainability.
- **Suggested fix:** Concrete code change or approach.
```

Example:
```
**[CRITICAL-1]** `handler.ts:12` — Hardcoded database password
- **Issue:** Database password is stored as a plain string literal.
- **Why it matters:** Credentials in source code can be leaked through version control.
- **Suggested fix:** Move to AWS Secrets Manager and retrieve at runtime via `GetSecretValueCommand`.
```

If a section has no findings, write "None — all checks passed." Do not omit the section.

### References
- Naming conventions and error handling patterns: #[[file:.kiro/skills/code-review/reference.md]]
- Example review output: #[[file:.kiro/skills/code-review/examples/sample-review-output.md]]
