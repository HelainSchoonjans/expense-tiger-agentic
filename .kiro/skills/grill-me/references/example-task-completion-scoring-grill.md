---
title: "Example Grill Session: Task Completion Scoring for the Learn Skill"
date: 2026-04-04
participants:
  - akirmak@ (human)
  - akirmak-agentic-ai (Kiro agent)
context: >
  The human had spent a session researching long-term memory best practices for AI coding agents.
  The research was documented in a reference doc (self-improving-agentic-coding-skill.md) which
  proposed adding a task completion metric to the learn skill. Before implementing, the human
  asked the agent to use the grill-me skill to challenge the design — "I don't assume I have
  the answers. I don't want you to blindly implement the proposal."
---

# Example: Grilling the Task Completion Scoring Design

## Background

The learn skill captures learnings from coding sessions — decisions, debugging insights, user
preferences, procedural knowledge. A proposed improvement was to add a **task completion score**
(0.0–1.0) to every learning session, inspired by the Reflexion paper's insight that the
fundamental evaluation metric for agent memory is whether it helps complete tasks.

The proposal had a clear direction but several unresolved design decisions. The grill session
resolved them one by one.

## Decisions Resolved

### Q1: Who assigns the score — human, agent, or collaborative?

**Tension:** Agent self-grading is unreliable (overconfidence bias). Human-only scoring adds
friction that could kill adoption of the `@learn` flow.

**Decision:** Collaborative. Agent proposes a score with a one-line justification, human
confirms or overrides. The override itself becomes a high-value learning signal.

### Q2: Where does the score live — in topic file frontmatter or a separate file?

**Tension:** Embedding session scores in each topic file (architecture.md, etc.) causes
duplication (one session touches multiple files), unbounded frontmatter growth, and mixes
two organizational axes (subject vs time).

**Decision:** Separate ledger (`project-learnings/task-completion-score-ledger.md`) with
compact rows. Topic files get a lightweight `<!-- session: ID -->` reference for lineage.
Ledger stays concise — just references, no verbose session content.

### Q3: What defines a "task" — individual tasks or whole sessions?

**Tension:** A single `@learn` session might cover multiple tasks, exploratory work with
no pass/fail, or interrupted work that pivoted mid-session.

**Decision:** Session-level scoring. One `@learn` = one ledger entry = one holistic score.
For exploratory sessions, score reflects "did we achieve the understanding we set out to get?"

### Q4: Should the agentStop hook also capture scores, or only @learn?

**Tension:** The `agentStop` hook runs automatically (no human interaction), but the
collaborative scoring model requires human confirmation.

**Decision:** Scoring only on `@learn`. The hook stays lightweight — captures facts but
doesn't attempt to score. Scoring is Type 2 thinking (deliberate reflection) and belongs
in the explicit `@learn` flow. Not every session gets scored, and that's fine.

### Q5: What's the session ID format?

**Options considered:** date+repo+hash, date+time+repo, date+repo+counter.

**Decision:** `YYYY-MM-DDTHH:MM-repo-name` using workspace folder name. Timestamp-to-the-minute
gives uniqueness without hashes or counters. Immediately readable, provides lineage at a glance.

### Q6: How does the agent determine the repo name?

**Decision:** Workspace folder name as default, git remote as fallback. Simple, always available,
good enough for lineage.

### Q7: Should "what worked / what to avoid" tagging be required on every learning?

**Tension:** The procedural framing (worked/avoid) is powerful for trajectory-based learnings
but forces a binary on things that aren't binary — some learnings are just facts.

**Decision:** Optional and soft. When the agent writes a learning, it considers whether the
procedural framing applies. If yes, tag it. If it's a factual observation, skip it. We don't
know yet if this tagging will help the skill — experiment first before hardening.

## Pattern Observed

The grill followed a natural dependency order:
1. Who scores? (foundational — affects everything downstream)
2. Where does it live? (storage model)
3. What gets scored? (scope definition)
4. When does scoring happen? (trigger model)
5. How is it identified? (ID format — depends on scope and storage decisions)
6. Implementation detail (repo name — minor, resolved quickly)
7. Adjacent feature (procedural tagging — related but separable)

Each question built on the previous answer. The agent brought a recommendation for each,
the human confirmed or refined, and decisions were locked in before moving on.
