---
name: grill-me
version: 2026-04-04-15:00-v0.2.0
author: Hasan-Basri AKIRMAK (akirmak@) — revising existing grill-me skill
changelog:
  - 2026-04-04 15:00 v0.2.0 — Added structured workflow, decision logging, and example reference. Clarified when to explore codebase vs ask.
  - 2026-03-29 18:30 v0.1.0 — Initial versioned release.
description: >
  Interview the user relentlessly about a plan or design until reaching shared understanding,
  resolving each branch of the decision tree. Use when user wants to stress-test a plan, get
  grilled on their design, or mentions "grill me".
---

# Grill Me

Stress-test a plan or design by walking through every decision branch until all ambiguity is resolved.

## How It Works

1. Read the plan/design the user wants to grill (from conversation context, a file, or a spec).
2. Identify every decision point, assumption, and ambiguity.
3. Ask questions **one at a time**, in dependency order — resolve foundational decisions before downstream ones.
4. For each question, **provide your recommended answer** with reasoning. Don't just ask — bring your perspective.
5. If a question can be answered by exploring the codebase, **explore the codebase instead of asking**. Don't waste the human's time on things you can verify yourself.
6. When the human answers, **lock in the decision** with a brief confirmation ("Locked in — X. Next question.") and move on.
7. After all branches are resolved, provide a **summary of all decisions made** as a compact reference.

## What Makes a Good Grill Question

- Surfaces a real tension or tradeoff (not a yes/no confirmation)
- Has practical implementation consequences
- Exposes assumptions that could break the design
- Follows dependency order (don't ask about storage format before deciding what to store)

## When to Stop

- All decision branches are resolved
- The human says they're satisfied
- You've covered the design space and further questions would be nitpicking

## Example

See `references/example-task-completion-scoring-grill.md` for a real grill session where we stress-tested the task completion scoring design for the learn skill. It resolved 7 decision points in sequence, each building on the previous.
