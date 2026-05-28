---
name: measure-devx-productivity
version: 2026-03-29-18:30-v0.1.0
author: Hasan-Basri AKIRMAK (akirmak@)
changelog:
  - 2026-03-29 18:30 v0.1.0 — Initial version with productivity report structure and agentic vs traditional comparison.
description: Measure and quantify the productivity impact of human-agent collaboration. Compares agentic development (human + AI agent) against traditional team estimates for the same scope. Produces a structured productivity report with TTM improvement, effort reduction, and cost analysis. Use when user mentions "productivity", "measure productivity", "devx metrics", "how fast did we build", "time to market", "effort comparison", "man-hours", "sprint planning", "team estimate", "productivity report", "agentic vs traditional", "ROI of AI coding", "development velocity", or wants to quantify the value of agent-assisted development.
---

# Measure DevX Productivity

Quantify the productivity impact of human-agent collaboration by comparing actual agentic development metrics against estimated traditional team effort for the same scope.

## When to Use

- After completing a project or milestone with agentic development
- When the user wants to demonstrate ROI of AI-assisted coding
- When comparing agentic vs traditional development approaches
- When creating a business case for agent adoption

## Methodology: Dual-Track Estimation

### Track 1: Actual Agentic Development (measured)

Collect real data from the project:

1. **Git timeline** — first commit to last commit = wall-clock elapsed time
2. **Human active time** — time the human was engaged (reviewing, deploying, providing input). Typically ≈ elapsed time for single-session projects, or sum of active periods for multi-session.
3. **Agent compute time** — runs in parallel with human, so doesn't add to elapsed time
4. **Task count** — from spec task lists (count completed tasks)
5. **Code volume** — lines of code excluding vendor/generated files (`git diff --stat` with exclusions)
6. **File count** — number of meaningful files created/modified
7. **Deliverables** — list what was actually produced (infra, backend, frontend, tests, docs, CI/CD, etc.)

### Track 2: Traditional Team Estimate (guesstimate)

Estimate what a traditional team would need for the same scope. This is inherently approximate — state assumptions clearly.

#### Step 1: Define the team composition

For a typical serverless full-stack project of this scope:

| Role | Count | Hourly Rate (USD) | Rationale |
|------|-------|--------------------|-----------|
| Senior Backend Developer | 1 | $85 | Lambda, DynamoDB, Bedrock integration, API design |
| Mid-Level Frontend Developer | 1 | $65 | SPA, auth flows, UI components |
| DevOps/Cloud Engineer | 0.5 | $80 | CDK, deployment scripts, CloudFront, observability |
| QA Engineer | 0.5 | $55 | E2E tests, backend tests, test planning |
| Tech Lead (part-time) | 0.25 | $100 | Architecture review, code review, coordination |

Rates are loaded costs (salary + benefits + overhead), not contractor rates. Adjust for your market.

#### Step 2: Estimate effort per work area

Break the project into work areas and estimate man-hours for each:

| Work Area | Tasks | Estimated Hours | Assigned To |
|-----------|-------|-----------------|-------------|
| IaC / CDK stack | Cognito, API GW, Lambda, DynamoDB, S3, CloudFront, logging | X | DevOps |
| Backend Lambda handlers | Extract (Bedrock), CRUD (DynamoDB), shared logging | X | Sr Backend |
| Frontend SPA | Auth, upload, editor, list, router, API client, CSS | X | Frontend |
| Testing | CDK unit tests, backend pytest, E2E Playwright, CLI scripts | X | QA + devs |
| Deployment & CI/CD | Deploy scripts, config generation, cache invalidation | X | DevOps |
| Documentation | README, API contract (OpenAPI), memory/learnings | X | Tech Lead |
| Debugging & fixes | Bug investigation, RCA, contract mismatches, model ID issues | X | Sr Backend + Frontend |
| Coordination overhead | Standups, PR reviews, Slack, context switching | X | All |

#### Step 3: Calculate coordination overhead

Traditional teams have overhead that agentic development largely eliminates:

- **Daily standups**: 15 min × team size × days
- **PR review cycles**: ~30 min per PR × number of PRs (assume 1 PR per work area)
- **Context switching**: ~20% overhead on multi-person projects
- **Waiting/blocking**: developer A blocked on developer B's API contract, etc.
- **Documentation sync**: keeping docs, contracts, and specs aligned across team members

Rule of thumb: add 30-50% to raw coding estimates for coordination on a 3-5 person team.

#### Step 4: Calculate calendar duration (TTM)

Man-hours ≠ calendar time. Account for:

- **Parallelism**: max 2-3 people working simultaneously (limited by dependencies)
- **Dependencies**: frontend blocked until API contract is defined, tests blocked until deploy
- **Critical path**: the longest sequential chain of dependent tasks
- **Working hours**: 6 productive hours per 8-hour day (meetings, breaks, context switching)

Formula: `Calendar days = Critical path hours / (6 productive hours/day)`

### Track 3: Comparison Metrics

| Metric | Formula | What It Means |
|--------|---------|---------------|
| Effort Reduction | `1 - (agentic_human_hours / traditional_total_hours)` | How much less human effort was needed |
| TTM Improvement | `1 - (agentic_elapsed / traditional_calendar_hours)` | How much faster to market |
| Effective Team Size | `traditional_team_FTE / 1` (human + agent = 1 human) | How many people the agent replaces |
| Cost Savings | `traditional_cost - agentic_cost` | Dollar savings (use hourly rates) |
| Lines/Hour (agentic) | `total_lines / agentic_elapsed_hours` | Agentic velocity |
| Lines/Hour (traditional) | `total_lines / traditional_total_hours` | Traditional velocity |
| Tasks/Hour | `completed_tasks / elapsed_hours` | Task throughput |

### Assumptions to State Explicitly

Every report must list these assumptions so readers can adjust:

1. Traditional team hourly rates (market, seniority level)
2. Coordination overhead percentage
3. Whether the traditional team has done a similar project before (learning curve)
4. Quality equivalence assumption (is the agentic output at the same quality level?)
5. Scope equivalence (did the agent produce the same deliverables a team would?)
6. Human review time included in agentic hours
7. Whether deployment/infra setup time is included

## Output

Generate `agentic-devx-productivity-report.md` in the project root with:

1. Executive Summary — key metrics table
2. What Was Built — scope and deliverables
3. Agentic Development (Actual) — measured data
4. Traditional Team Estimate — team, effort, calendar
5. Comparison — side-by-side metrics
6. Assumptions & Caveats
7. Methodology note

Reference the report from the project README.

## Data Collection Commands

```bash
# Git timeline
git log --format="%ai" --reverse | head -1  # first commit
git log --format="%ai" -1                    # last commit

# Code volume (excluding vendor/generated)
git diff --stat <first>..<last> -- \
  ':(exclude)node_modules' ':(exclude)cdk.out' ':(exclude)*.pyc' \
  ':(exclude)package-lock.json' ':(exclude)cdk/package-lock.json'

# Task count
grep -c '^\s*- \[x\]' .kiro/specs/*/tasks.md

# File count
git diff --name-only <first>..<last> -- \
  ':(exclude)node_modules' ':(exclude)cdk.out' | wc -l
```

## Report Metadata & Revision History

All generated reports (productivity reports, lessons-learned summaries, etc.) must include:

### Header metadata
Add a creation timestamp and project name at the top of every report, immediately after the title:

```markdown
# Report Title

Created: YYYY-MM-DD HH:MM TZ
Project: [project name]
```

### Revision history
Add a revision history table at the very end of every report:

```markdown
---

## Revision History

| Date | Change |
|------|--------|
| YYYY-MM-DD HH:MM | Initial report created |
```

### When updating an existing report
- Update the relevant sections with new data
- Add a new row to the revision history table with the date and a one-line summary of what changed
- Do NOT update the "Created" date — that stays as the original creation date
- Example revision entry: `| 2026-04-15 09:30 | Updated traditional estimate after team feedback on hourly rates |`
