---
name: human-agent-team
version: 2026-04-03-14:30-v0.7.0
author: Hasan-Basri AKIRMAK (akirmak@)
changelog:
  - 2026-04-03 14:30 v0.7.0 — Added feasibility test pattern (test risky assumptions before implementation). Learned from ISSUE-016 streaming.
  - 2026-04-03 14:00 v0.6.0 — Hardcoded Slack channel to naivigateher-hba, added description note about Slack notifications being enabled by default.
  - 2026-04-03 13:30 v0.5.0 — HARD RULE: Never commit without E2E evidence. Strengthened E2E evidence gate to absolute — no git add, no git commit, no MR until deployed + E2E tested + screenshots captured. Learned from ISSUE-016 where agent tried to commit after QA logic review but before E2E testing.
  - 2026-04-01 22:30 v0.4.0 — Added E2E evidence gate (mandatory before MR), full fix cycle reference, screenshot conventions, deployment role separation. Learned from first successful agent-driven fix cycle (ISSUE-003).
  - 2026-04-01 16:30 v0.3.0 — Added fix plan pattern to collaboration loop (analyze → plan → implement → MR → review).
  - 2026-04-01 16:00 v0.2.0 — Added glab/GitLab MR workflow, agent git identity convention, and MR creation commands.
  - 2026-03-29 18:30 v0.1.0 — Initial version with delegation patterns, trust boundaries, and agent handoff workflows.
description: >
  Framework for running a collaborative team of human developers and AI agents as peers. Use when
  planning team workflows, defining task ownership between humans and agents, setting up PR-based
  review flows, or designing subagent delegation patterns. Slack notifications are enabled by default
  to channel naivigateher-hba — modify or disable in section 8 if needed. Trigger when user mentions
  "team topology", "human-agent collaboration", "agent workflow", "task delegation", "who does what", "agent-safe tasks", "pair programming with AI", "what tasks can I give to agents", "how should my team work with AI", "agent boundaries", "when to use subagents", "AI code review", "agent PR workflow", "human in the loop", "agent autonomy", "delegation patterns", "what should agents do vs humans", "AI teammate", "working with AI agents", "agent handoff", "session continuity", or wants to organize work across humans and agents. Also use when someone asks about trust boundaries, agent error handling, or how to recover when agent output is wrong.
---

# Human-Agent Team Collaboration

A practical framework for teams where human developers and AI agents work as peers — not just humans giving orders to bots.

## Core Principle

**Humans own decisions. Agents own throughput.**

Humans bring judgment, long-term context, creativity, and stakeholder trust. Agents bring speed, codebase-wide awareness, consistency, and parallelism. The repo is the shared workspace. PRs are the integration point.

This division exists because agents excel at well-defined, pattern-based work but lack the contextual judgment needed for novel problems, architectural tradeoffs, and risk assessment. When you lean into these complementary strengths rather than fighting them, the team moves faster with fewer mistakes.

---

## 1. Deciding Who Does What

The single most important decision in human-agent collaboration is task assignment. Get this wrong and you either bottleneck the human on trivial work or let the agent loose on tasks where it'll produce confident-sounding but subtly wrong output.

### Agent-safe tasks (agent does it, human reviews)

These share three traits: clear intent, bounded scope, and mistakes caught easily in review.

- **Scaffolding and boilerplate** — new module structure, CRUD endpoints, config files
- **Mechanical refactoring** — rename symbols, extract functions, apply consistent patterns
- **Test generation** — unit tests for existing functions, edge case coverage
- **Documentation** — docstrings, README updates, API docs derived from code
- **Repetitive edits** — bulk find-and-replace, migration scripts, format/lint fixes
- **Research and context gathering** — searching docs, summarizing findings, reading logs

Why these work well for agents: the expected output is predictable enough that a human reviewer can quickly spot problems. The agent isn't making judgment calls — it's executing a well-understood pattern.

### Agent-assisted tasks (human drives, agent supports)

Here the human makes the decisions, but the agent accelerates execution significantly.

- **Architecture** — human decides the design, agent scaffolds the structure and generates diagrams
- **Complex features** — human defines the approach and writes core logic, agent fills in boilerplate and tests
- **Code review** — human makes accept/reject decisions, agent summarizes changes and flags patterns
- **Debugging** — human forms hypotheses, agent searches the codebase and tests them
- **Planning** — human prioritizes, agent breaks down tasks and estimates scope

The key distinction: the human is steering. The agent is rowing. If you find the agent making design choices in this mode, the task boundaries need tightening.

### Human-required tasks (agent supports with research only)

Some tasks carry consequences that demand human judgment — not because agents are incapable, but because the cost of a subtle mistake is too high for review alone to catch.

- **Architecture decisions** — long-term consequences, tradeoff judgment that requires business context
- **Security-sensitive changes** — IAM policies, secrets management, auth flows
- **Production deployments** — blast radius assessment, rollback planning
- **Customer-facing copy** — tone, brand voice, legal implications
- **Novel problem-solving** — no established pattern to follow, requires creative leaps
- **Deleting data or resources** — irreversible actions need explicit human intent

For these, agents can still help with research, gathering context, and drafting options — but a human initiates, decides, and executes.

### Quick classification check

```
Is the task well-defined with bounded scope?
├── YES → Is it repeatable / pattern-based?
│   ├── YES → Agent-safe (agent does it, human reviews PR)
│   └── NO  → Agent-assisted (human drives, agent supports)
└── NO  → Human-required (human does it, agent may research)
```

When in doubt, start with agent-assisted. It's easy to grant more autonomy once trust is established; it's harder to undo a bad autonomous decision.

---

## 2. The PR-Based Workflow

All agent work flows through the same review process as human work. This isn't bureaucracy — it's the mechanism that makes agent autonomy safe. PRs create a natural checkpoint where humans can catch hallucinated imports, missed conventions, or subtly wrong logic before it hits main.

### The collaboration loop

1. **Human creates task** — issue, backlog item, or direct instruction with clear scope
2. **Agent analyzes and creates a fix plan** — before writing code, the agent documents its understanding of the problem, root cause analysis, proposed design, tasks, and acceptance criteria in a fix plan (e.g., `project-learnings/003-fix-plan.md`). This is the agent's "thinking out loud" — it forces evidence gathering and gives the human a checkpoint before any code is written.
3. **Agent updates the issue** — posts the fix plan summary as a comment on the issue (or links to the fix plan file), so the issue tracks the full lifecycle from report → analysis → fix → verification.
4. **Agent works on a branch** — creates or modifies files within the defined scope, following the fix plan.
5. **Agent opens MR** — or presents a diff for the human to review. MR description references the fix plan and the issue.
6. **Human reviews** — same standards as human-to-human review. The fix plan makes review faster because the reviewer already knows the intent.
7. **Human merges or requests changes** — agent addresses feedback if needed.

### Fix plan pattern

Before implementing any non-trivial change, the agent should create a fix plan document. This is especially important for bug fixes and features that touch multiple files. The fix plan lives in TWO places:

1. **In the repo**: `project-learnings/NNN-fix-plan.md` — the full document
2. **In the issue tracker**: Posted as a comment on the GitLab/GitHub issue — so anyone on the team can see the design without cloning the repo

Both must contain the full plan, not just a summary. The fix plan includes:

- **Problem** — what's broken, with exact symptoms
- **Root cause** — what the agent found, with evidence (log lines, code references)
- **User stories / acceptance criteria** — what "fixed" looks like
- **Design** — the proposed approach, with code snippets showing before/after
- **Tasks** — ordered implementation steps
- **Files changed** — which files will be touched
- **What this does NOT fix** — explicit scope boundaries

The fix plan serves three purposes: it forces the agent to think before coding, it gives the human a review checkpoint before any code is written, and it creates a record of why changes were made (useful for future debugging).

### PR conventions for agent work

Use a branch naming convention like `agent/<task-short-name>` so agent work is immediately identifiable. PR descriptions from agents should include:

- What task was assigned (link to issue if applicable)
- What the agent did and the approach it took
- What it was uncertain about, if anything — this is important because it tells the reviewer where to focus

Labeling agent PRs (e.g., `agent-authored`) helps with tracking velocity and quality metrics over time.

### Agent identity in git and merge requests

Agent-authored commits and MRs should be visually distinguishable from human work. Use a dedicated git author and MR title prefix:

- **Git author**: `akirmak-agentic-ai <akirmak+agentic-ai@amazon.com>`
- **MR title prefix**: `[akirmak-agentic-ai]`
- **Commit command**: `git commit --author="akirmak-agentic-ai <akirmak+agentic-ai@amazon.com>" -m "message"`

This convention ties agent work to the human who owns it (for accountability) while making it filterable in GitLab. The MR is opened under the human's account, but every commit clearly shows it was agent-authored.

### Opening MRs with glab (GitLab CLI)

For GitLab-hosted repos, agents can open merge requests directly using the `glab` CLI tool. Prerequisites: `glab` installed and authenticated with `gitlab.aws.dev` (see `project-learnings/agent-workflow.md` for setup details).

```bash
# 1. Create a feature branch
git checkout -b agent/short-task-name

# 2. Make changes and commit with agent identity
git add .
git commit --author="akirmak-agentic-ai <akirmak+agentic-ai@amazon.com>" \
  -m "feat: description of what was done"

# 3. Push and open MR
git push -u origin agent/short-task-name
GITLAB_HOST=gitlab.aws.dev glab mr create \
  --title "[akirmak-agentic-ai] description of the change" \
  --description "## What\n\nDescription of what was done and why.\n\n## Uncertainty\n\nAnything the reviewer should pay extra attention to." \
  --target-branch main
```

For GitHub-hosted repos, use the `gh` CLI or the GitHub MCP server's `create_pull_request` tool instead — same conventions for author and title prefix apply.

### Reviewing agent PRs effectively

Agent code tends to fail in specific, predictable ways. Focus your review energy on these:

- **Does it match the intended design?** Agents optimize for the literal instruction, which sometimes diverges from the actual goal.
- **Hallucinated dependencies** — imports, APIs, or patterns that don't exist in your project.
- **Project conventions** — agents default to generic best practices rather than your team's specific patterns. Steering docs help here.
- **Over-engineering** — agents sometimes add unnecessary abstraction layers. Simpler is usually better.
- **Edge cases in business logic** — agents handle the happy path well but may miss domain-specific edge cases.

---

## 3. Handling Agent Mistakes and Uncertainty

Agents will produce wrong output. This isn't a failure of the workflow — it's expected and the system is designed for it. The key is having clear patterns for catching and correcting mistakes efficiently.

### When agent output is wrong

1. **Don't just reject — explain why.** Agents learn from feedback within a session. A rejection with "this is wrong" wastes the context. "This is wrong because we use repository pattern here, not direct DB calls — see `src/repos/` for examples" gives the agent what it needs to fix the issue.

2. **Check if it's a pattern problem or a one-off.** If the agent keeps making the same mistake, the fix is usually a steering doc or convention file, not repeated corrections. Write the convention down once and the agent follows it going forward.

3. **Scope the retry.** Don't ask the agent to redo everything — point it at the specific part that needs fixing. "The API handler is good, but rewrite the validation logic to use our Zod schemas in `src/schemas/`."

### When the agent is uncertain

Good agent behavior includes flagging uncertainty. When an agent says "I'm not sure about X" or "I made an assumption about Y," treat these as high-priority review items. The agent is telling you exactly where to look.

If the agent doesn't flag uncertainty but you suspect it should have, that's a signal the task scope was too ambiguous. Tighten the task definition for next time.

### Escalation patterns

- **Agent hits a blocker** → Agent should stop and describe the blocker rather than guessing. The human unblocks with a decision or more context.
- **Agent produces conflicting output** → Usually means the task had implicit dependencies. Decompose differently next time.
- **Agent keeps failing at a task type** → Move that task type from agent-safe to agent-assisted until you understand why.

---

## 4. Context and Session Continuity

The hardest part of human-agent collaboration is transferring context — between sessions, between team members, and between agents.

### Making context persistent

Agents lose context between sessions. The fix is making important context live in the repo, not in chat history.

| What to persist | Where | Why it matters |
|----------------|-------|----------------|
| Architecture decisions | `docs/adr/` or decision records | Agents (and new humans) need to know WHY things are the way they are |
| Project conventions | Steering docs or CONTRIBUTING.md | Prevents agents from defaulting to generic patterns |
| Task context | Issue descriptions, PR descriptions | Enables anyone to pick up where someone left off |
| Complex logic rationale | Inline code comments | Local context that's too specific for a doc |

### Session handoff pattern

When picking up where a previous session (human or agent) left off:

1. Check the branch/PR for what was done and what's pending
2. Read the original task description for intent
3. Read relevant steering docs for conventions
4. If context is unclear, ask rather than guess — guessing compounds errors across handoffs

### Keeping agents aligned across a project

For longer-running projects, maintain a lightweight project brief that agents can reference. This doesn't need to be elaborate — even a few paragraphs covering the project's purpose, key architectural choices, and current priorities helps agents produce more relevant output.

---

## 5. Subagent Delegation

When a task is large enough to parallelize, decompose it and delegate to subagents. This is powerful but has specific constraints that matter.

For detailed delegation patterns, templates, and anti-patterns, see `references/subagent-patterns.md`.

### Parallelization with multiple specs/task files

The most effective pattern for parallel execution is maintaining separate spec or task files per workstream, then triggering them together in a single prompt:

1. **Structure work into independent specs** — e.g., `expense-backend/tasks.md` and `expense-frontend/tasks.md`, each with a clear ordered task list.
2. **Invoke both in one prompt** — ask the agent to run all tasks from both specs in parallel using the `use_subagent` tool. Example: *"Run all tasks for the backend spec AND all tasks for the frontend spec in parallel using subagents."*
3. **Each spec becomes one subagent** — the agent reads both task files, then delegates each to a separate subagent running concurrently.

This works because each spec is self-contained with its own scope, files, and sequential task order — the independence boundary is the spec itself.

### IDE limitation: one active request per workspace

In the Kiro IDE, multiple separate chat sessions are queued — only one executes at a time per workspace. The subagent approach within a single conversation is the workaround. In the CLI (`kiro-cli chat`), you can open multiple terminal tabs for independent parallel sessions, but they won't share context.

### Key principles (the details are in the reference)

- **Subagents can't talk to each other** — they run in parallel with isolated context. The orchestrator (human or main agent) must provide all context upfront and integrate results afterward.
- **Decompose along independence boundaries** — if two pieces of work need to coordinate, they shouldn't be separate subagents.
- **Provide complete context per subagent** — each one should have everything it needs: task description, relevant files, conventions, and explicit boundaries on what NOT to touch.
- **Plan for integration** — the orchestrator resolves conflicts between subagent outputs. Interface mismatches between frontend and backend subagents, for example, are normal and expected.

---

## 6. Team Roles

These roles aren't rigid job titles — they're hats that team members wear. One human might wear multiple hats. The point is clarity about who's responsible for what.

| Role | Typically | Key responsibilities |
|------|-----------|---------------------|
| Tech Lead | Human | Architecture decisions, PR approval authority, sprint priorities |
| Developer | Human | Complex features, debugging, code review, novel problems |
| Agent-Developer | Agent | Agent-safe tasks, agent-assisted support, context gathering |
| Orchestrator | Human or Agent | Task decomposition, delegation, progress tracking |

The orchestrator role is interesting because it can be filled by either a human or an agent, depending on the task. For well-understood work (like "add CRUD for these 5 entities"), an agent orchestrator works well. For exploratory work ("figure out why performance degraded"), a human orchestrator is better because the decomposition itself requires judgment.

---

## Applying This Framework

When helping a user set up human-agent collaboration:

1. **Start with their current workflow.** Don't impose a framework — adapt to how they already work and identify where agents can slot in.
2. **Classify their common tasks** using the rubric in section 1. This usually surfaces quick wins (agent-safe tasks humans are currently doing manually).
3. **Set up the PR workflow** if they don't have one. This is non-negotiable — it's the safety mechanism that makes everything else work.
4. **Start small.** Pick 2-3 agent-safe tasks, run them through the workflow, and build trust before expanding scope.
5. **Write conventions down.** Every time an agent makes a mistake that a steering doc would have prevented, write that steering doc. The investment pays off across every future agent interaction.
6. **Review and adjust.** After a few cycles, revisit the task classification. Some tasks you thought were human-required might be agent-safe with the right conventions in place. Others might need to move the other direction.


---

## 7. Evidence Before Action (Critical Tenet)

This is the single most important principle in human-agent collaboration. It applies to debugging, architecture decisions, and any situation where the agent is about to make a change based on a hypothesis.

### The problem

Agents are pattern matchers. When they see a symptom, they match it to a known pattern from training data and propose a fix — often confidently, often wrong. This is dangerous because:

1. The agent sounds authoritative, so the human may not push back
2. The proposed fix addresses the pattern, not the actual cause
3. Architectural changes based on false assumptions are expensive to undo

### Real-world example from this project

Two incidents in the same debugging session:

| Incident | Agent's assumption | Reality | Cost if not caught |
|----------|-------------------|---------|-------------------|
| "Bedrock is too slow" | Vision calls exceed API GW 29s timeout → need async (SQS + polling) | Actual latency: 4 seconds. Real issue: deprecated model ID | ~500 lines of unnecessary async code |
| "CORS misconfiguration" | Missing CORS headers between API GW and Lambda | Lambda was crashing (bad model ID), API GW returned 5xx without CORS headers | Hours modifying correct CORS settings while real bug persists |

Both times, the human asked: **"How do you know?"** — and the agent had no evidence. This single question prevented two rabbit holes.

### The rule

**Before proposing any change — especially architectural — the agent must state what evidence supports the diagnosis.** No log line, no metric, no test result = no diagnosis. Only a guess.

### Protocol for the agent

```
1. OBSERVE  — What is the exact error?
2. MEASURE  — Can you reproduce it? What does the data say?
3. DIAGNOSE — What does the EVIDENCE point to?
4. FIX      — Change one thing, verify it works
5. CONFIRM  — Re-run the original failing scenario
```

### Feasibility test before risky implementation

When an implementation depends on an unverified API behavior or architectural assumption,
write a minimal standalone test BEFORE writing production code. This takes 5 minutes and
can save hours of wasted implementation.

Example: ISSUE-016 streaming depended on `stream_async` yielding text chunks through tool
calls. A 30-line test script verified this in 5 seconds. If it had failed, the entire
streaming architecture would have needed a different approach — and we'd have known before
writing 500+ lines of production code.

Pattern:
1. Identify the risky assumption ("does X actually work the way we think?")
2. Write a minimal script that tests ONLY that assumption
3. Run it against the real environment
4. If it passes → proceed with implementation
5. If it fails → research alternatives before writing any production code

### Protocol for the human

Even if you agree with the agent's intuition, ask:
- "What evidence do you have for that?"
- "Can we measure it before changing anything?"
- "What's the cheapest way to verify this theory?"

If the agent can't answer these, the right next step is **add observability** (logs, metrics, CLI tests), not implement a fix.

### Why this matters for team workflows

When agents work autonomously (autopilot mode, subagents), there's no human to ask "how do you know?" The agent must internalize this check:

> "I think the cause is X. Before I act on that, what's the fastest way to verify? Can I check a log? Run a test? Measure latency? If I can't verify, my first action is to add observability — not to fix my guess."

This self-check should happen at step 2 of the triage process (Explore and diagnose) and before any architectural proposal in task planning.

---

## 8. E2E Evidence Gate — ABSOLUTE RULE

Build tests, static analysis, and QA logic review are necessary but NOT sufficient.

**NEVER `git push`, NEVER open an MR until the fix is:**
1. **Deployed** to the real environment (Lambda, AgentCore, staging, etc.)
2. **Tested end-to-end** through the actual user flow (frontend → backend → response)
3. **Evidence captured** — screenshots for UI changes, response logs for backend changes
4. **Only then**: `git push`, open MR

Local `git commit` on a branch is allowed as a checkpoint (save your work, create restore points). But a commit is NOT a signal that the work is done. A commit does NOT mean you can push or open an MR. The hard gate is push + MR — that's where E2E evidence is mandatory.

This rule exists because the agent twice tried to push after "build passes" without deploying or testing E2E. Both times the human caught it. The cost of untested code reaching an MR is much higher than the cost of testing first.

### What counts as E2E evidence

| Fix type | Minimum evidence |
|----------|-----------------|
| Frontend UI change | Playwright screenshots showing before/during/after states |
| Backend API change | Deployed Lambda + real API call with response captured |
| Data model change | DynamoDB query showing correct data shape |
| Agent behavior change | Real conversation showing correct routing/output |
| Infrastructure change | `aws` CLI output confirming resource state |
| Streaming/real-time | Screenshots showing progressive text rendering mid-stream |

### This rule is shared across all agents and skills

This E2E evidence gate is not just a human-agent-team convention — it is enforced in:
- `~/.kiro/agents/qa-engineer.md` — QA reports must state whether E2E testing was done
- `~/.kiro/skills/triage-issue/SKILL.md` — extends "evidence before action" to the full fix lifecycle

If any agent or skill proposes committing without E2E evidence, the human should reject it.

### Slack notification before every human input request

When the agent needs human action (deployment, approval, credential switch, decision),
it MUST send a Slack message FIRST, then make the request in Kiro. The pattern:

1. Post to Slack channel `naivigateher-hba`: "🤖 Need your help in Kiro — [what's needed]"
2. Then immediately make the request in the Kiro chat

The channel is hardcoded to `naivigateher-hba`. Do NOT post to any other channel.
This ensures the human gets notified on their phone/desktop even if they're away from
the IDE. The Slack message is the "come to Kiro" signal. Never skip it.

> Note: Slack notifications are enabled by default targeting `naivigateher-hba`.
> To change the channel or disable notifications, edit this section.

### Screenshot conventions

- Location: `Docs/Test/AI-Test-Results/`
- Naming: `issue-<NNN>-<description>.png`
- Capture at minimum: before state, active/processing state, completed state
- Tool: Playwright `browser_take_screenshot` for UI, CloudWatch for logs

### Deployment role separation

Some environments require credentials the agent doesn't have (different AWS accounts, production access, SSO-gated systems). In these cases:

- Agent prepares the deployment artifact (zip file, config, etc.)
- Human executes the deployment command in their terminal
- Agent verifies the deployment succeeded (check logs, test endpoint)

This is not a limitation — it's a feature. The human maintains control over what gets deployed where, while the agent handles the preparation and verification.

### The full fix cycle

```
1. PICK    — Human selects issue
2. PLAN    — Agent writes fix plan, human reviews
3. BRANCH  — Agent creates agent/<issue-name> branch
4. CODE    — Agent implements, commits with agent identity
5. TEST    — Agent runs build + logic tests (qa-engineer subagent)
6. DEPLOY  — Human deploys to restricted environments (agent prepares artifacts)
7. E2E     — Agent runs end-to-end test, captures evidence
8. MR      — Agent pushes branch, opens MR via glab/gh with Fixes #N linking
9. REVIEW  — Human reviews MR, approves
10. MERGE  — Human merges
11. CLOSE  — Agent updates issue tracker, CHANGELOG, memory
```
