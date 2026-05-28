# Subagent Delegation Patterns

Detailed reference for decomposing tasks and delegating to subagents effectively. The main SKILL.md covers the principles — this file covers the practical patterns.

## When to Use Subagents

Subagents make sense when work can be genuinely parallelized. If the pieces depend on each other, sequential execution (even by a single agent) is usually better than parallel subagents that can't coordinate.

| Scenario | Pattern | Why it works |
|----------|---------|-------------|
| Multi-layer feature | One subagent per layer (backend, frontend, tests) | Layers have well-defined interfaces |
| Research then implement | One subagent researches, results feed into implementation | Clear dependency chain |
| Bulk operations | One subagent per independent unit (e.g., per-service refactor) | Units are truly independent |
| Review and fix | One subagent analyzes, another applies fixes | Analysis output is the fix input |

## Delegation Template

When delegating to a subagent, provide all five of these. Missing any one of them is the most common cause of poor subagent output.

```
Task:        What to do — be specific about the expected outcome
Scope:       Which files/modules to touch — explicit paths when possible
Context:     Architecture decisions, conventions, constraints that affect the work
Output:      What to produce — code files, analysis summary, test suite, etc.
Boundaries:  What NOT to touch or change — this prevents scope creep
```

### Why boundaries matter

Without explicit boundaries, subagents tend to "helpfully" refactor adjacent code, update imports in files outside their scope, or restructure things they shouldn't touch. This creates merge conflicts when integrating multiple subagent outputs. Being explicit about boundaries ("only modify files in `src/api/users/`, do not change any shared utilities") prevents this.

## Example: Feature Implementation

```
Human: "Add user profile page with avatar upload"

Orchestrator decomposes:
├── Subagent A: Backend
│   Task: Lambda handler + DynamoDB schema for user profiles
│   Scope: src/api/profiles/, infrastructure/
│   Context: We use single-table DynamoDB design (see docs/adr/003-dynamodb.md)
│   Output: Handler code, table schema update, API types
│   Boundaries: Don't modify existing handlers or shared middleware
│
├── Subagent B: Frontend
│   Task: Profile page component with avatar upload UI
│   Scope: src/pages/profile/, src/components/
│   Context: We use React + TailwindCSS, file uploads go through presigned S3 URLs
│   Output: Page component, upload component, API client calls
│   Boundaries: Don't modify the router or layout components
│
├── Subagent C: Tests
│   Task: Unit tests for profile backend and frontend
│   Scope: tests/
│   Context: We use Jest for backend, React Testing Library for frontend
│   Output: Test files with >80% coverage of new code
│   Boundaries: Don't modify existing test utilities
│
└── Subagent D: Documentation
    Task: API docs for profile endpoints + README update
    Scope: docs/, README.md
    Output: OpenAPI spec additions, updated README
    Boundaries: Don't restructure existing docs

Human reviews integrated result, resolves interface mismatches
(e.g., frontend expects `avatarUrl` but backend returns `avatar_url`).
```

## Integration: The Orchestrator's Job

After subagents complete, the orchestrator (human or main agent) needs to:

1. **Check interface alignment** — do the pieces fit together? Type mismatches, naming inconsistencies, and assumed-but-missing shared utilities are common.
2. **Resolve conflicts** — if two subagents modified the same file (which shouldn't happen with good boundaries, but sometimes does), merge manually.
3. **Run the full test suite** — individual subagent tests may pass in isolation but fail when integrated.
4. **Verify the whole is coherent** — does the combined output actually achieve the original goal?

## Constraints to Remember

- **Max ~4 subagents in parallel** — more than this and the orchestration overhead outweighs the parallelism benefit.
- **Subagents can't communicate** — if subagent B needs output from subagent A, run A first, then pass its output to B. Don't try to make them coordinate.
- **Each subagent needs complete context** — they don't inherit the parent's conversation history. Anything they need to know must be explicitly provided.

## Anti-Patterns

| Don't do this | Why it fails | Do this instead |
|--------------|-------------|-----------------|
| Delegate tasks with cross-subagent dependencies | They can't coordinate, so they'll make incompatible assumptions | Run dependent tasks sequentially or give one subagent both pieces |
| Give vague scope ("improve the codebase") | Subagents work best with concrete, bounded tasks | Be specific: "refactor `src/utils/date.ts` to use date-fns instead of moment" |
| Skip human review because "it's just subagent work" | Subagent output needs the same review rigor as any agent output | Review every PR, regardless of source |
| Use subagents for human-required tasks | Architecture and security decisions need human judgment | Use subagents for research/context gathering, human decides |
| Provide different conventions to different subagents | Their outputs won't be consistent | Point all subagents at the same steering docs |
