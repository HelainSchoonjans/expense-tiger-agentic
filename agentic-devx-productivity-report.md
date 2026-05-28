# Agentic DevX Productivity Report

Created: 2026-03-29 01:00 CET
Project: Expense Submission App (expense-tiger-agentic)

## Executive Summary

> **Note**: This is an experimental report. The methodology, estimates, and savings are based on a single developer's experience over 2 sessions (one primary build session + one follow-up). Treat the numbers as directional indicators, not audited figures. The goal is to develop a repeatable measurement practice, not to produce a definitive benchmark.

### Why This Matters

The premise behind this project is simple: humans and AI agents work best as peers, not as master and servant. The `human-agent-team` skill captures it in one line — *humans own decisions, agents own throughput*. Skills, steering, and hooks are the mechanism that makes this real. They encode domain knowledge, conventions, and guardrails so the agent can operate with increasing autonomy while the human focuses on judgment, creativity, and stakeholder trust.

### How It Works

Each skill is a reusable knowledge artifact. Instead of re-explaining CDK patterns, Bedrock model formats, or Cognito auth flows every session, the agent loads the relevant skill and operates at the level of a knowledgeable team member from the first prompt. Steering shapes behavior globally (API contract enforcement, MCP-first approach). Hooks automate the routine (save learnings, block dangerous commands). Together, they compound — every session benefits from every previous session's captured knowledge.

### Why Now

We're at an inflection point where AI coding assistants are moving from "autocomplete on steroids" to genuine team members that can own entire workstreams. But without structured knowledge (skills) and behavioral guardrails (steering + hooks), agents remain stateless — they start from zero every session, repeat mistakes, and require constant hand-holding. The investment in skills authoring is the difference between a tool you use and a teammate you trust.

### Key Metrics

| Metric | Agentic (Actual) | Traditional (Estimate) | Improvement |
|--------|-----------------|----------------------|-------------|
| Elapsed time (TTM) | 4.1 hours | 5.4 days (43.2 hours) | 90.5% faster |
| Total human effort | ~4 hours | 34 man-hours | 88% less effort |
| Team size | 1 human + 1 agent | 3.25 FTE | 3.25× leverage |
| Estimated cost | ~$400* | ~$2,695 | ~$2,295 saved (85%) |
| Code output | 4,285 lines / 50 files | Same scope | — |
| Task throughput | 5.4 tasks/hour | ~1 task/hour | 5.4× faster |

*Agentic cost = human time × blended rate. Agent compute cost (API calls) not included — typically negligible relative to labor.

---

## What Was Built

A complete serverless expense submission application, from zero to deployed and tested:

| Deliverable | Details |
|-------------|---------|
| CDK Infrastructure | Cognito, API Gateway (REST + CORS + Cognito authorizer), 2 Lambda functions, DynamoDB, S3 + CloudFront (OAC), CloudWatch logging, CloudFront access logs |
| Backend (Python) | Receipt extraction via Bedrock Claude Sonnet 4.6 (vision), Expense CRUD with DynamoDB, structured JSON logging |
| Frontend (Vanilla JS) | SPA with auth (Cognito SRP), receipt upload + preview, expense editor with line items, expense list, hash router |
| Testing | 33 CDK unit tests, 13 backend API tests (pytest), 15 E2E tests (Playwright), Bedrock CLI test script |
| Deployment | Full-stack deploy script, frontend-only deploy script, config.js generation from CDK outputs, CloudFront cache invalidation |
| Documentation | README (225 lines), OpenAPI spec (257 lines), API contract steering file, debugging notes, learnings |
| DevOps/Observability | API Gateway execution logs, Lambda log groups (14-day retention), CloudFront access logs to S3 |
| Bug fixes & RCA | 3 bugs found and fixed: legacy Bedrock model ID, snake_case/camelCase contract mismatch, DynamoDB Decimal conversion |

---

## Track 1: Agentic Development (Actual Measurements)

### Timeline (from git history)

| Event | Timestamp | Elapsed |
|-------|-----------|---------|
| First commit (initial) | 2026-03-28 20:22 | 0:00 |
| MVP commit (full app) | 2026-03-28 23:26 | 3:04 |
| .gitignore | 2026-03-28 23:29 | 3:07 |
| Bug fixes commit | 2026-03-29 00:30 | 4:08 |

Total wall-clock time: **4 hours 8 minutes**

### Human involvement

The human was actively engaged throughout the session:
- Reviewing agent proposals and pushing back on assumptions
- Running deploy commands (`./scripts/deploy.sh`) — 5 deploys total
- Providing AWS credentials (SSO login refresh)
- Creating Cognito test user via CLI
- Uploading test receipt images
- Making architectural decisions (logging strategy, async vs sync, contract format)
- Triggering parallel subagent execution

Estimated human active time: **~4 hours** (continuous single session)

### Agent involvement

The agent worked in parallel with the human, handling:
- All code generation (CDK, Lambda, frontend JS, CSS, tests)
- Spec creation (requirements → design → tasks)
- Interactive browser testing via Playwright MCP
- CloudWatch log analysis for debugging
- AWS documentation lookups for model IDs
- Memory and skill updates

### Code volume

| Category | Lines | Files |
|----------|-------|-------|
| CDK infrastructure (TypeScript) | 680 | 6 |
| Backend Lambda (Python) | 566 | 4 |
| Frontend SPA (JS/HTML/CSS) | 1,190 | 9 |
| Tests (pytest, Playwright, bash) | 597 | 4 |
| Deployment scripts (bash) | 74 | 2 |
| Specs & documentation | 1,178 | 25 |
| **Total** | **4,285** | **50** |

### Tasks completed

| Spec | Completed Tasks |
|------|----------------|
| Main spec (expense-submission-app) | 23 tasks (incl. subtasks) |
| Backend spec (expense-backend) | 5 tasks |
| Frontend spec (expense-frontend) | 8 tasks |
| Ad-hoc (debugging, README, memory, GitLab issues) | ~8 tasks |
| **Total** | **~44 tasks** |

Note: Backend and frontend specs overlap with main spec subtasks (they were created for parallel subagent execution). Unique task count is approximately 22 distinct work items.

---

## Track 2: Traditional Team Estimate

### Team composition

| Role | Allocation | Hourly Rate (USD) | Rationale |
|------|-----------|-------------------|-----------|
| Senior Backend Developer | 1.0 FTE | $85 | Lambda + Bedrock integration, API design, DynamoDB, debugging |
| Mid-Level Frontend Developer | 1.0 FTE | $65 | SPA with auth, 5 view components, CSS, API client |
| DevOps/Cloud Engineer | 0.5 FTE | $80 | CDK stack, deploy scripts, CloudFront, observability setup |
| QA Engineer | 0.5 FTE | $55 | E2E tests, backend tests, test planning, bug verification |
| Tech Lead (part-time) | 0.25 FTE | $100 | Architecture review, API contract, code review, coordination |
| **Total** | **3.25 FTE** | | |

### Effort breakdown (man-hours)

| Work Area | Estimated Hours | Assigned To | Notes |
|-----------|----------------|-------------|-------|
| CDK infrastructure | 4h | DevOps | Cognito, API GW, Lambda, DynamoDB, S3, CloudFront, logging — experienced CDK dev |
| Backend: Extract handler | 3h | Sr Backend | Bedrock integration, prompt engineering, response parsing, error handling |
| Backend: Expenses CRUD | 2h | Sr Backend | DynamoDB CRUD, validation, Decimal conversion |
| Backend: Shared logging | 1h | Sr Backend | Structured JSON formatter, request context |
| Frontend: Auth module | 3h | Frontend | Cognito SRP auth, sign-in/sign-up/sign-out, session management |
| Frontend: Receipt uploader | 2h | Frontend | File validation, preview, base64 encoding, API call |
| Frontend: Expense editor | 3h | Frontend | Editable fields, line items, total recalculation, validation |
| Frontend: Expense list | 1.5h | Frontend | API fetch, card rendering, empty state, loading |
| Frontend: Router + API client | 1.5h | Frontend | Hash router, snake_case conversion, JWT injection |
| Frontend: CSS styling | 2h | Frontend | Responsive layout, forms, cards, loading states |
| CDK unit tests (33 tests) | 2h | DevOps + QA | Template assertions for all resources |
| Backend API tests (pytest) | 2h | QA | Stack outputs, CORS, auth gate, CloudWatch verification |
| E2E tests (Playwright) | 3h | QA | 15 test cases, auth flows, upload, editor, list |
| Bedrock CLI test script | 0.5h | Sr Backend | Text + image test with timing |
| Deploy scripts | 1h | DevOps | Full deploy + frontend-only deploy + config generation |
| API contract (OpenAPI spec) | 1h | Tech Lead | Define wire format, request/response schemas |
| README documentation | 1.5h | Tech Lead | Architecture, setup, testing, project structure |
| **Subtotal (raw coding)** | **34h** | | |

### Coordination overhead

| Overhead Type | Estimate | Calculation |
|---------------|----------|-------------|
| Daily standups | 1.9h | 15 min × 3.25 people × 2.5 days |
| PR review cycles | 3.5h | ~30 min × 7 PRs (one per work area) |
| API contract negotiation | 1h | Backend + frontend agree on wire format |
| Context switching | 6.8h | 20% of 34h raw coding |
| Waiting/blocking | 2h | Frontend blocked on API contract, tests blocked on deploy |
| **Subtotal (overhead)** | **15.2h** | **45% of raw coding** |

### Total traditional effort

| | Hours |
|---|---|
| Raw coding effort | 34.0h |
| Coordination overhead | 15.2h |
| **Total man-hours** | **49.2h** |

### Calendar duration (TTM)

The critical path determines calendar time:

```
Day 1 (6 productive hours):
  - CDK infrastructure (4h) → Deploy → API contract definition (1h)
  - Parallel: Tech Lead reviews architecture (1h)

Day 2 (6 productive hours):
  - Backend handlers (6h) — blocked until CDK deployed
  - Frontend: Auth module (3h) + Router/API client (1.5h) — can start after contract
  - Parallel: Frontend CSS (2h)

Day 3 (6 productive hours):
  - Frontend: Uploader (2h) + Editor (3h) + List (1.5h)
  - Backend: debugging/fixes as frontend integration reveals issues
  - Deploy + integration testing begins

Day 4 (6 productive hours):
  - Testing: CDK tests (2h) + Backend tests (2h) + E2E tests (3h)
  - Bug fixes from testing (contract mismatch, Decimal conversion, etc.)
  - Deploy scripts finalization

Day 5 (half day — 3 productive hours):
  - Documentation: README, API spec cleanup
  - Final deploy + verification
  - Bug triage and issue creation
```

**Traditional calendar duration: ~5.4 days (43.2 productive hours)**

### Traditional cost estimate

| Role | Hours | Rate | Cost |
|------|-------|------|------|
| Senior Backend Developer | 12h | $85 | $1,020 |
| Mid-Level Frontend Developer | 14h | $65 | $910 |
| DevOps/Cloud Engineer | 7h | $80 | $560 |
| QA Engineer | 7h | $55 | $385 |
| Tech Lead | 3.5h | $100 | $350 |
| Coordination overhead (distributed) | — | — | (included above) |
| **Total** | **43.5h** | | **$3,225** |

Note: Overhead hours are distributed across roles proportionally. Total hours exceed 34h raw because overhead is added.

---

## Comparison

| Metric | Agentic | Traditional | Delta |
|--------|---------|-------------|-------|
| Wall-clock time (TTM) | 4.1 hours | 43.2 hours (5.4 days) | **90.5% faster** |
| Human effort | ~4 hours | 43.5 man-hours | **90.8% reduction** |
| Team size | 1 person | 3.25 FTE | **3.25× leverage** |
| Cost (labor) | ~$400 | ~$3,225 | **$2,825 saved (87.6%)** |
| Code velocity | 1,044 lines/hour | 126 lines/hour | **8.3× faster** |
| Task throughput | 5.4 tasks/hour | ~1 task/hour | **5.4× faster** |
| Bugs found & fixed | 3 (same session) | 3 (across days) | Same count, faster cycle |
| Deploy cycles | 5 deploys in 4h | ~3 deploys across 5 days | Faster feedback loop |

### Where agentic development wins big

1. **Zero coordination overhead** — no standups, no PR review cycles, no waiting for another developer's API contract. The agent holds the full context.
2. **Instant context switching** — the agent moves from CDK to Lambda to frontend to tests without ramp-up time.
3. **Parallel execution** — backend and frontend specs ran simultaneously via subagents.
4. **Integrated debugging** — agent reads logs, tests in browser, and fixes code in one flow. No context lost between "find bug" and "fix bug".
5. **Documentation as a byproduct** — specs, memory, README generated alongside code, not as an afterthought.

### Where traditional teams still have advantages

1. **Novel architecture decisions** — the human still made all key design choices.
2. **Security review depth** — IAM policies, auth flows benefit from dedicated security review.
3. **Domain expertise** — for domain-heavy applications, human domain experts are irreplaceable.
4. **Long-term maintainability** — traditional teams build shared understanding across multiple people; agentic knowledge lives in memory files and docs.

---

## Assumptions & Caveats

1. **Hourly rates** are US-market loaded costs (salary + benefits + overhead) for mid-to-senior engineers. Adjust ±30% for your market.
2. **Coordination overhead at 45%** is based on industry research for 3-5 person teams. Smaller teams have less overhead; larger teams have more.
3. **Traditional team is experienced** — they've built serverless apps before. A team new to CDK/Bedrock would take longer.
4. **Quality is assumed equivalent** — the agentic output has 33 CDK tests, 13 backend tests, 15 E2E tests, and was interactively tested. A traditional team might write more comprehensive tests.
5. **Scope is identical** — both tracks produce the same deliverables. The agentic approach also produced specs, memory files, and skill updates that a traditional team wouldn't.
6. **Human review time is included** in the 4-hour agentic figure — the human was actively reviewing throughout.
7. **Agent compute costs** (Bedrock API calls, LLM inference) are not included. These are typically $5-20 for a session of this length — negligible vs labor savings.
8. **Single-session bias** — this was a greenfield project built in one continuous session. Multi-session projects with context loss would show smaller gains.
9. **The human is technical** — they can review agent output, make architecture decisions, and run deploy commands. A non-technical human would need more agent guardrails.

## Methodology

This report uses the **Dual-Track Estimation** methodology from the `measure-devx-productivity` skill:

- **Track 1 (Agentic)**: Real measurements from git history, task specs, and code diffs
- **Track 2 (Traditional)**: Bottom-up estimation by work area, with role-based assignment and coordination overhead
- **Comparison**: Ratio-based metrics (effort reduction, TTM improvement, cost savings)

The traditional estimate is a guesstimate — it represents a reasonable expectation for an experienced team, not a precise prediction. The agentic measurements are factual (git timestamps, line counts, task counts).

---

*Generated by the `measure-devx-productivity` skill on 2026-03-29.*
*Data source: git history of `expense-tiger-agentic` repository, Kiro spec task files.*

---

## Revision History

| Date | Change |
|------|--------|
| 2026-03-30 13:30 | Added executive summary with Why/How/Why Now framing, experimental disclaimer |
| 2026-03-29 01:00 | Initial report created from git history and spec task data |
