---
title: Self-Improving Agentic Coding — Long-Term Memory Best Practices
version: 2026-04-04-v0.1.0
authors:
  - Hasan-Basri AKIRMAK (akirmak@)
  - akirmak-agentic-ai (Kiro agent collaborator)
status: draft
changelog:
  - 2026-04-04 v0.1.0 — Initial analysis document. Grouped research inputs, mapped to current learn skill, identified gaps and proposed improvements.
---

# Self-Improving Agentic Coding — Long-Term Memory Best Practices

## 1. Introduction & Scope

This document analyzes how long-term memories should be created, stored, and retrieved in the context of an AI-assisted coding workflow — and how our `learn` skill should evolve to implement these best practices.

**Target user:** The everyday developer — the practitioner SA, CSM, TAM — and the future software engineer. Someone who uses an AI coding agent (like Kiro) to build demos, PoCs, and production features, and wants to get better at it over time without manually curating knowledge bases.

**Focus:** Individual developer productivity. This is the innermost feedback loop — one developer, one agent, one project. The developer creates, stores, and retrieves learnings in real-time as they work.

**Acknowledged but out of scope:**
- Team-level memory (multiple developers on the same project sharing learnings)
- Organization-level memory (cross-team knowledge propagation)

These outer loops matter, but we don't plan to boil the ocean. Individual productivity is where the most granular, highest-value learning happens, and it's the foundation the outer loops will build on.

## 2. The Human Brain Analogy — Type 1 vs Type 2 Thinking

The human brain processes information through two systems:

- **Type 1 (fast, automatic):** Pattern matching, reflexive responses, no deliberate effort. In our context, this is the conversation itself — the agent's working memory within a session. It's ephemeral. When the session ends, it's gone.

- **Type 2 (slow, reflective):** Deliberate analysis of experiences, extracting lessons, updating mental models. This is what happens when an engineer steps back and thinks: "What did I learn from that debugging session? What would I do differently next time?"

**The learn skill is the engineer's Type 2 brain.** It doesn't happen automatically during the flow of work — it's triggered deliberately (via `@learn`) at reflection points. It takes the raw experience of a session and distills it into durable, reusable knowledge.

This maps directly to the Reflexion pattern described by Shinn et al. (2023): an LLM reflects on previous agent trajectories — including tool calls, reasoning steps, and outcomes — to generate higher-level insights about what worked and what didn't.

> **Reference:** Shinn, N., Cassano, F., Gopinath, A., Shinn, K., Labash, S., & Liu, B. (2023). *Reflexion: Language Agents with Verbal Reinforcement Learning.* [arXiv:2303.11366](https://arxiv.org/pdf/2303.11366)

## 3. Memory Ownership & Actors

### Who creates memories?

The individual developer. This is the outermost edge where learning happens — it's the most granular, most contextual, and most immediately useful. No centralized system can capture "when I tried approach X on this codebase, it failed because of Y" with the same fidelity as the person (and agent) who lived through it.

### Three perspectives on a single session

Every coding session produces learnings at three levels:

1. **Conversation-focused:** "While working on issue XXX, we discovered that..."
2. **User-focused:** "Developer X learned that when working on issue XXX..."
3. **Agent-focused:** "Kiro (with skills A, B, C and tools X, Y, Z) learned that when working with user X on issue XXX..."

All three perspectives are valuable. The current learn skill primarily captures (1) and (2). Perspective (3) — what the agent itself should do differently — is handled by Phase 2 (Reflect) and Phase 3 (Propose), which feed back into skill and steering improvements.

### Who triggers memory creation?

The human developer, via `@learn`. This is deliberate — Type 2 thinking. The `memory-save` hook also runs automatically on `agentStop` for lightweight Phase 1 (remember) captures, but the full reflection loop requires human initiation.

### Who stores memories?

The agent writes to `project-learnings/` files (current MVP). Future: Long-Term Memory service with text + embeddings (episodic memory).

### Who retrieves memories?

The agent, on demand, via skill invocation. The `memory-recall` hook loads the index (`README-LTM.md`) on every `promptSubmit`, giving the agent baseline context. Deeper retrieval happens when the agent activates the learn skill or reads specific topic files.

## 4. How Memories Are Created

### Triggers

- **Conversation Closure Detection:** A session has meaningfully ended — signaled by a git commit, git push, or the human invoking `@learn`.
- **Reflection Prompts:** The human explicitly says `@learn`, triggering the full 3-phase loop (remember → reflect → propose).
- **Automatic capture:** The `memory-save` hook fires on `agentStop`, running a lightweight Phase 1 check.

### The Reflexion Pattern

To generate procedural memories, we apply the Reflexion pattern on agent trajectories. The LLM reflects on the sequence of actions taken during a session — tool calls, reasoning steps, decisions, outcomes — and infers higher-level insights:

- **What worked:** The most effective approach or strategy used in the conversation.
- **What to avoid:** The most important pitfall or ineffective approach to steer away from in future sessions.

### What gets stored (priority order)

1. **What worked** — effective approaches, strategies, patterns that led to success
2. **What to avoid** — pitfalls, dead ends, approaches that wasted time or produced bad results
3. **Task trajectories** — sequences of states the agent traversed to achieve a specific goal (procedural memory)
4. **Conversation/work summaries** — think of these like changelog entries for the session
5. **User preferences** — communication style, tool preferences, workflow conventions

## 5. Memory Types We Capture

### Procedural Memory

Procedural memory is knowledge about *how to do things* — learned through experience, not documentation. In the human brain, it's the difference between reading about how to ride a bike and actually knowing how to ride one.

In our context, procedural memory captures how-to knowledge extracted from agent trajectories:

- "When building an enterprise chat agent, use API Gateway WebSocket + Lambda router + AgentCore Runtime — not a monolithic Lambda."
- "When debugging CDK deployment failures, check the CloudFormation events first via `troubleshoot_cloudformation_deployment`, not the Lambda logs."
- "When the user asks for a new skill, use the skill-creator skill — don't hand-write the SKILL.md."

The learn skill generates procedural memories by reflecting on what worked and what didn't across sessions. This is the core value — not just remembering facts, but learning *how to be effective*.

### Summarization Memory

Session summaries and changelogs. These provide context for future sessions ("last time we worked on X, we got to Y state") but don't encode behavioral lessons. The learn skill captures these in `CHANGELOG.md` entries and `project-learnings/` topic files.

### Mapping to our current learn skill

| Memory Type | Learn Skill Phase | Storage Location |
|---|---|---|
| Procedural (what worked/didn't) | Phase 1: Remember | `project-learnings/*.md` |
| Summarization (session summaries) | Phase 1: Remember | `CHANGELOG.md` |
| Behavioral (skill/steering updates) | Phase 2: Reflect → Phase 3: Propose | `skills/*/SKILL.md`, `steering/*.md` |
| User preferences | Phase 1: Remember | `project-learnings/preferences.md` |

## 6. How Memories Are Stored

### Current state (MVP)

Memories are stored as `.md` files in `project-learnings/`, organized by topic. This is textual memory in its simplest form — human-readable, version-controlled, portable across LLMs.

```
project-learnings/
├── README-LTM.md      # Index (loaded on every prompt)
├── architecture.md     # Technical decisions
├── agent-workflow.md   # Agent patterns
├── preferences.md      # User preferences
└── ...                 # Topic files as needed
```

**Why textual memory (for now):**
- Highly interpretable — you can read and debug it directly
- Easy to implement — just markdown files
- Portable — works with any LLM, any IDE
- Version-controlled — git tracks the evolution of learnings

**Limitations:**
- Doesn't scale — as learnings grow, loading everything into context becomes expensive
- No semantic search — retrieval is file-based, not meaning-based
- No cross-project sharing — learnings are local to the repo

### Next release: Long-Term Memory (LTM)

The planned evolution stores memories with text + embeddings in an episodic memory system. This enables:
- Semantic retrieval (find relevant memories by meaning, not filename)
- Scalable storage (not limited by context window)
- Cross-project memory (learnings from project A inform project B)

## 7. How Memories Are Retrieved

### Retrieval strategies

- **Recency-based:** Most recent memories first. Simple but misses important older learnings.
- **Relevancy-based:** Semantic similarity to the current task. Powerful but can miss critical context that's semantically distant.
- **Multi-faceted (our approach):** Combines importance + relevance. This is what the agent using skills provides — the skill system acts as a multi-faceted retrieval layer.

### Our retrieval model

- **Importance:** Distinguishes mundane memories from core memories. A user correction ("never do X") is more important than a session summary.
- **Relevance:** How semantically related a memory is to the current task. When building a CDK stack, architecture decisions about CDK are more relevant than debugging notes about frontend CSS.

### Retrieval actors

Memories are retrieved on demand by the agent via skill invocation. The `memory-recall` hook loads the index on every prompt (lightweight, always-on). Deeper retrieval happens when the agent reads specific topic files based on the current task context.

## 8. Task Completion — The North Star Metric

### Why task completion matters

The ultimate measure of whether a memory system is working is: **does it help the agent complete tasks more effectively?** If memories are being stored but never improve outcomes, the system is just journaling.

Task completion is the fundamental evaluation metric: did the set of actions in this session lead to success or failure?

### How we know task completion

The developer triggers `@learn` at the end of a session. At that point, the conversation history contains the full trajectory — the goal, the actions taken, the outcomes. The LLM can assess whether the task was completed. The human-agent-team skill provides the collaboration framework that makes this assessment meaningful.

### Current gap

**The learn skill does NOT currently capture task completion as a metric.** It captures *what happened* (summaries, decisions) and *what was learned* (procedural insights), but it doesn't record *whether the task succeeded* and to what degree.

### Proposed improvement: Task Completion Score

At every `@learn` trigger, the learn skill should capture a task completion assessment. This gets stored in the frontmatter of project-learnings files:

```yaml
---
name: architecture
version: 2026-04-04
authors:
  - akirmak@ (human)
  - akirmak-agentic-ai (agent collaborator)
sessions:
  - timestamp: 2026-04-04T14:30:00Z
    project: my-repo-name
    session: "Fix WebSocket connection dropping on idle timeout"
    taskCompletion: 0.85
    summary: "Identified root cause (API GW 10min idle timeout), implemented heartbeat. Partial — heartbeat works but reconnection logic not yet tested."
  - timestamp: 2026-04-03T10:00:00Z
    project: my-repo-name
    session: "Add Cognito auth to API endpoints"
    taskCompletion: 1.0
    summary: "Full implementation, tested, deployed."
---
```

**Score interpretation:**
- `0.0–0.3` — Task not completed. High-value learning for *what doesn't work*.
- `0.4–0.7` — Partial completion. Mixed signals — some approaches worked, some didn't.
- `0.8–1.0` — Task completed. High-value learning for *what works*.

Both ends of the spectrum are valuable. A `0.1` score with good procedural notes ("we tried X, Y, Z and all failed because of W") is as useful as a `1.0` score with a clean trajectory to replicate.

## 9. Proposed Improvements to the Learn Skill

Based on this analysis, three concrete improvements to the learn skill:

### 9.1 Capture task completion metric

At every `@learn` trigger, assess and record:
- What was the session's goal?
- Was it completed? (0.0–1.0 score)
- What was the project and session context?

This feeds the procedural memory with outcome data — turning "we did X" into "we did X and it worked/didn't work."

### 9.2 Add frontmatter schema to project-learnings files

Standardize project-learnings files with structured frontmatter:

```yaml
---
name: <topic>
version: <date>
authors:
  - <human-alias> (human)
  - <agent-identity> (agent collaborator)
sessions: [...]  # Task completion records
---
```

This makes learnings machine-parseable and enables future analytics on learning patterns.

### 9.3 Explicitly capture procedural memories

Update the learn skill's Phase 1 to explicitly generate two categories:

- **What worked:** The approach/strategy that led to success (or progress). Stored as actionable how-to knowledge.
- **What to avoid:** The approach that failed or wasted time. Stored as anti-patterns with context on *why* it failed.

Currently, the skill captures "decisions made" and "debugging insights" — but doesn't frame them through the procedural lens of worked/didn't-work. This framing makes memories more actionable for future retrieval.

---

## Appendix A: Memory Quality & Evaluation Metrics

Three metrics for assessing the quality of stored memories:

| Metric | Definition | Why it matters |
|---|---|---|
| **Completeness** | How fully the memory captures all relevant details of the event | Incomplete memories lead to partial context in future sessions |
| **Factual accuracy** | How accurate the memory is relative to known facts and source data | Inaccurate memories actively harm future sessions |
| **Novelty** | Degree to which the memory contains new, unique, or unexpected information | Redundant memories waste storage and retrieval budget |

## Appendix B: Memory/Learning Lifecycle Management

Steps involved in the creation, storage, and upkeep of memories:

### PREP
- Create skill(s) — define what to capture and how
- Assign data stewards — who owns the quality of stored memories
- Create reflection prompts — the templates that guide memory extraction
- Define access policies — who can read/write which memories

### DATA CREATION & STORAGE
- Detect/trigger learning — conversation closure, `@learn` invocation, `agentStop` hook
- Create learning — apply Reflexion pattern to extract procedural insights
- Store learning — write to `project-learnings/` (MVP) or LTM (future)

### MAINTENANCE
- Manage version and evolution — skill, prompt, and schema changes over time
- Optimize for cost & performance — prune low-value memories, compress verbose entries
- Monitor access & usage — which memories are actually retrieved and useful?

## Appendix C: Architecture Options — Store & Serve

Three architectural patterns for memory systems (future reference, not current scope):

**Option 1 — Centralized Creation & Centralized Storage:**
A central system creates all learnings and serves all developers. Simple but creates a bottleneck and loses individual context.

**Option 2 — Centralized Creation & Decentralized Storage:**
A central system creates memories and distributes them so each component can listen and store what they're interested in. Better scalability, but creation is still a single point of failure.

**Option 3 — Decentralized Creation & Decentralized Storage:**
Each system listens to raw conversations and creates the memories they're interested in. Most resilient and scalable, but hardest to ensure consistency and quality.

Our current approach is effectively Option 3 at the individual level — each developer's agent creates and stores its own memories locally.

## Appendix D: Memory Forms

### Textual Memory (our choice)

Information stored explicitly in human-readable representations (markdown, JSON, plain text).

**Pros:** Highly interpretable, easy to implement, efficient read/write, allows direct inspection and debugging, portable across LLMs.

**Cons:** Can become verbose, computationally expensive as memory grows (full-text loading into context), limited to models that process text.

### Parametric Memory (acknowledged, not our focus)

Information encoded in model weights through fine-tuning or training. Less interpretable, opaque, and computationally expensive to write (requires retraining). Not suitable for real-time updates from dynamic interactions.

### Storage format options

| Format | Strengths | Weaknesses |
|---|---|---|
| **Plain text / Markdown** | Interpretable, simple, works everywhere | Verbose, no structured querying |
| **JSON** | Structured, parseable by non-LLM systems | Less human-readable, rigid schema |
| **Vector databases** | Semantic similarity search, scales well | Requires embedding pipeline, less interpretable |
| **Graph databases** | Excellent for relationships and interconnected knowledge | Complex to implement and maintain |

Our MVP uses markdown (interpretable, version-controlled). The LTM evolution will add vector embeddings for semantic retrieval while keeping the textual source as ground truth.

## Appendix E: Distinctions

### Memory vs Analytics

While we use stored interactions to derive insights, memory and analytics serve different functions:

- **Memory** is for real-time contextual recall — "what did we learn last time we worked on this?"
- **Analytics** is for offline strategic insight generation — "across all sessions this quarter, what patterns emerge?"

Both use the same underlying data, but the access patterns and latency requirements are fundamentally different.

### Memory vs RAG

Memory and RAG are nearly identical on the retrieval side — both use semantic similarity, chunking, and embedding-based search to find relevant information.

The difference is in **what gets stored**. RAG stores raw source documents (docs, code, articles). Memory stores *processed* versions of experiences — summaries, user profiles, preferences, procedural memories. We don't store the raw conversation; we store the distilled learning from it.

## Appendix F: Known Unresolved Concerns

These are acknowledged but not yet addressed. They're important for future releases:

- **Purpose limitation:** Memories should only be used for the purpose they were created for. How do we enforce this?
- **Data sensitivity:** Some learnings may contain sensitive architectural details or business logic. Classification and access control needed.
- **Transparency and user control:** The developer should always be able to see, edit, and delete their memories. Current MVP (markdown files) provides this naturally.
- **Quality checks:** How do we ensure memory quality over time? Automated scoring (completeness, accuracy, novelty) is a start, but who validates?
- **Memory depreciation:** Learnings decay in relevance. A CDK pattern from 6 months ago may be outdated. Expiry/decay mechanisms needed.
- **User consent:** The developer should explicitly opt in to memory creation. Current design (human-triggered `@learn`) provides this, but the `agentStop` hook runs automatically.
