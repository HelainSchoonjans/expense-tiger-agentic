---
name: learn
version: 2026-04-04-15:00-v0.4.0
author: Hasan-Basri AKIRMAK (akirmak@)
changelog:
  - 2026-04-04 15:00 v0.4.0 — Added task completion scoring (Phase 1.5), session ID convention, procedural memory tagging (optional), task-completion-score-ledger, frontmatter schema for topic files. See references/self-improving-agentic-coding-skill.md for research.
  - 2026-04-03 14:00 v0.3.0 — Fixed cold-start issue: remember phase now uses conversation context first, only reads project-learnings/ files when checking for cross-session duplicates.
  - 2026-04-02 18:00 v0.2.0 — Renamed from memory to learn. Added reflect + propose steps (skill/steering improvement with human gate). Learn = remember + reflect + adapt.
  - 2026-03-29 18:30 v0.1.0 — Added reverse chronological ordering and HH:MM timestamps.
description: >
  Learn from every session: remember decisions and insights, score task completion, reflect on
  whether skills or steering should evolve, and propose improvements with human approval. Think
  of this as the engineer's Type 2 brain — deliberate reflection on experiences, not just
  in-session pattern matching. Activate when the user says "learn", "remember", "save learnings",
  "update memory", or references the @learn prompt.
---

# Learn Skill

The agent's learning loop across sessions. Four phases: remember, score, reflect, adapt.

## Goal

Ensure that knowledge discovered during a session is never lost AND that the agent's behavior
improves over time. A future session should start with context, and the skills/steering that
guide agent behavior should get better with each iteration.

## The Learning Loop

### Phase 1: Remember (automatic, no confirmation needed)

Save learnings to `project-learnings/` files. This is the original memory function.

#### What to capture (high-value)
- User corrections to your approach or output
- Build/test/deploy commands discovered or confirmed
- Architectural decisions made or explained
- Debugging sessions that reveal non-obvious root causes
- User preferences ("I prefer X over Y", "always use Z")
- Workarounds for known issues
- Project conventions not documented elsewhere
- Skill/steering failures — note what failed and the pattern

#### Procedural memory tagging (optional, soft)
When writing a learning, consider: is this a procedural insight? If so, tag it:
- **What worked:** The approach/strategy that led to success or progress.
- **What to avoid:** The approach that failed or wasted time, with context on *why*.

Not every learning is procedural — factual observations and preferences don't need this tag.
This is experimental; we'll evaluate whether it improves retrieval quality over time.

#### What to skip
- Generic programming knowledge
- Information already in README, docs, or config files
- Temporary debugging steps that won't recur

#### Writing rules
1. You already have the full conversation context — use it. Don't re-read project-learnings/ files unless you need to check whether a specific learning was already captured in a prior session.
2. Quick reference items go in README-LTM.md
3. Detailed notes go in topic files (`architecture.md`, `agent-workflow.md`, etc.)
4. Use `## YYYY-MM-DD HH:MM: Title` format, newest first (reverse chronological)
5. Add a session ID comment below each heading: `<!-- session: YYYY-MM-DDTHH:MM-repo-name -->`
   - Repo name = workspace folder name (fallback: git remote name)
6. Update existing entries rather than appending duplicates — only read the target file before writing to check for duplicates
7. Keep README-LTM.md under 150 lines, topic files under 200 lines
8. NEVER store PII, credentials, API keys, or secrets

#### Topic file frontmatter
All `project-learnings/*.md` topic files should have this frontmatter:
```yaml
---
name: <topic>
version: <date of last update>
authors:
  - <human-alias> (human)
  - <agent-identity> (agent collaborator)
---
```

Also update `CHANGELOG.md` and `README.md` if new artifacts were created this session.

### Phase 1.5: Score Task Completion (STOP and wait for human confirmation)

After remembering, assess the session's task completion. This only runs on `@learn` — NOT on the `agentStop` hook.

1. Identify what the session's goal was (from conversation context).
2. Propose a task completion score (0.0–1.0) with a one-line justification:
   - `0.0–0.3` — Task not completed. High-value learning for *what doesn't work*.
   - `0.4–0.7` — Partial completion. Mixed signals.
   - `0.8–1.0` — Task completed. High-value learning for *what works*.
3. Present the proposed score to the human. Wait for confirmation or override.
   - If the human overrides, the override itself is a learning signal — note the delta.
4. Generate a session ID: `YYYY-MM-DDTHH:MM-repo-name`
5. Append a row to `project-learnings/task-completion-score-ledger.md`:

```markdown
| <session-id> | <score> | <one-line summary> | <topic files updated> |
```

The ledger stays compact — just references, no verbose content. The detailed learnings live in the topic files.

### Phase 2: Reflect (automatic, no confirmation needed)

After remembering, scan the session for signals that skills or steering should evolve:

- Did the agent make a mistake that a skill/steering rule would have prevented?
- Did we discover a pattern that should be codified in an existing skill?
- Did we establish a new convention that other workspaces should follow?
- Did a steering rule prove wrong, incomplete, or too aggressive?
- Did we learn something about a tool/MCP that should update mcp-first-approach?
- Did we refine how agents should work (update human-agent-team skill)?

If nothing found: stop here. Not every session produces skill improvements.

### Phase 3: Propose & Adapt (REQUIRES HUMAN APPROVAL)

If Phase 2 identified skill/steering updates:

1. List each proposed change:
   - Which file would change
   - What specifically would be added/modified/removed
   - Why (link to the session learning that triggered it)
2. Wait for the human to approve, modify, or reject each proposal
3. Only after approval: make the edits, bump the version in frontmatter, add a changelog entry

**Do NOT edit skills or steering files without explicit human approval.**
Remembering is safe (Phase 1). Changing agent behavior is not (Phase 3).

## Memory Data Location

```
project-learnings/
├── README-LTM.md                       # Index and overview (always loaded first)
├── task-completion-score-ledger.md      # Session scores — one row per @learn invocation
├── architecture.md                      # Architecture decisions and patterns
├── agent-workflow.md                    # Agent patterns, delegation, subagent usage
├── preferences.md                       # User preferences and working style
├── debugging.md                         # Debugging insights and gotchas
├── commands.md                          # Build, test, deploy commands
└── ...                                  # Any other topic files as needed
```

## How It Works (Hooks)

### Learn Recall (`hooks/memory-recall.kiro.hook`)
- Triggers on: `promptSubmit` (every new message)
- Action: Silently reads `project-learnings/README-LTM.md` to load context
- Does NOT mention to the user that it's reading memory

### Learn Save (`hooks/memory-save.kiro.hook`)
- Triggers on: `agentStop` (when agent execution completes)
- Action: Runs Phase 1 (remember) automatically
- Phase 2 (reflect) and Phase 3 (propose) run when the user invokes `#learn` prompt

## The #learn Prompt

For the full learning loop (all 3 phases + docs update + git command), use the `#learn` prompt at the end of a session. See `prompts/learn.md`.
