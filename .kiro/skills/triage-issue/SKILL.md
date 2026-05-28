---
name: triage-issue
version: 2026-03-29-18:30-v0.1.0
changelog:
  - 2026-03-29 18:30 v0.1.0 — Initial versioned release.
description: Triage a bug or issue by exploring the codebase to find root cause, then create a GitHub issue with a TDD-based fix plan. Use when user reports a bug, wants to file an issue, mentions "triage", or wants to investigate and plan a fix for a problem.
---

# Triage Issue

Investigate a reported problem, find its root cause, and create a GitHub issue with a TDD fix plan. This is a mostly hands-off workflow - minimize questions to the user.

## Process

### 1. Capture the problem

Get a brief description of the issue from the user. If they haven't provided one, ask ONE question: "What's the problem you're seeing?"

Do NOT ask follow-up questions yet. Start investigating immediately.

### 2. Explore and diagnose

Use the Agent tool with subagent_type=Explore to deeply investigate the codebase. Your goal is to find:

- **Where** the bug manifests (entry points, UI, API responses)
- **What** code path is involved (trace the flow)
- **Why** it fails (the root cause, not just the symptom)
- **What** related code exists (similar patterns, tests, adjacent modules)

Look at:
- Related source files and their dependencies
- Existing tests (what's tested, what's missing)
- Recent changes to affected files (`git log` on relevant files)
- Error handling in the code path
- Similar patterns elsewhere in the codebase that work correctly

### 3. Identify the fix approach

Based on your investigation, determine:

- The minimal change needed to fix the root cause
- Which modules/interfaces are affected
- What behaviors need to be verified via tests
- Whether this is a regression, missing feature, or design flaw

### 4. Design TDD fix plan

Create a concrete, ordered list of RED-GREEN cycles. Each cycle is one vertical slice:

- **RED**: Describe a specific test that captures the broken/missing behavior
- **GREEN**: Describe the minimal code change to make that test pass

Rules:
- Tests verify behavior through public interfaces, not implementation details
- One test at a time, vertical slices (NOT all tests first, then all code)
- Each test should survive internal refactors
- Include a final refactor step if needed
- **Durability**: Only suggest fixes that would survive radical codebase changes. Describe behaviors and contracts, not internal structure. Tests assert on observable outcomes (API responses, UI state, user-visible effects), not internal state. A good suggestion reads like a spec; a bad one reads like a diff.

### 5. Create the GitHub issue

Create a GitHub issue using `gh issue create` with the template below. Do NOT ask the user to review before creating - just create it and share the URL.

<issue-template>

## Problem

A clear description of the bug or issue, including:
- What happens (actual behavior)
- What should happen (expected behavior)
- How to reproduce (if applicable)

## Root Cause Analysis

Describe what you found during investigation:
- The code path involved
- Why the current code fails
- Any contributing factors

Do NOT include specific file paths, line numbers, or implementation details that couple to current code layout. Describe modules, behaviors, and contracts instead. The issue should remain useful even after major refactors.

## TDD Fix Plan

A numbered list of RED-GREEN cycles:

1. **RED**: Write a test that [describes expected behavior]
   **GREEN**: [Minimal change to make it pass]

2. **RED**: Write a test that [describes next behavior]
   **GREEN**: [Minimal change to make it pass]

...

**REFACTOR**: [Any cleanup needed after all tests pass]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] All new tests pass
- [ ] Existing tests still pass

</issue-template>

After creating the issue, print the issue URL and a one-line summary of the root cause.

## Critical Tenet: Evidence Before Action

**This is the most important rule in this skill.** Never propose a fix — especially an architectural change — based on pattern matching alone. Even if the human agrees with your intuition, YOU must insist on evidence.

### The anti-pattern (what goes wrong)

```
Agent sees symptom → Agent matches to known pattern → Agent proposes fix for the pattern
```

This fails because the symptom may not match the pattern you think it does. Real-world example:
- Symptom: "CORS error in browser" → Agent assumes CORS misconfiguration → Actually a Lambda crash (missing CORS headers on 5xx)
- Symptom: "Bedrock call might be slow" → Agent assumes timeout → Actually 4 seconds (well within limits), real issue was a deprecated model ID

In both cases, the agent was about to make significant changes (modify CORS settings, redesign to async architecture) that would not have fixed the actual problem.

### The correct pattern

```
1. OBSERVE  — What is the exact error? (full error message, HTTP status, log output)
2. MEASURE  — Reproduce it. Get data. Check logs. Run a timing test. If no logs exist, ADD THEM FIRST.
3. DIAGNOSE — What does the EVIDENCE point to? (not what it "looks like" or "could be")
4. FIX      — Change ONE thing. The minimal fix for the diagnosed cause.
5. CONFIRM  — Re-run the original failing scenario. Did it actually fix it?
```

### Rules the agent MUST follow

1. **Before proposing any fix, state what evidence supports your diagnosis.** If you can't point to a log line, metric, or test result, you don't have a diagnosis — you have a guess.

2. **If observability is missing, your first fix is to add it.** Don't debug blind. Add logging, enable traces, create a CLI test script — whatever gives you data. This is always the right first step.

3. **Never change architecture based on a theory.** Measure first. A 5-minute CLI test can save hours of unnecessary redesign.

4. **Never trust client-side error messages as root cause.** Browser errors describe what the browser sees, not what the server did. Always check server-side logs.

5. **Even if the human agrees with your assumption, push back on yourself.** Say: "I think it's X, but let me verify before we change anything." The human may not have the context to challenge you — that doesn't make your assumption correct.

6. **Log your reasoning.** In the issue or in memory, document: "I initially suspected X because of Y, but evidence showed Z." This builds a pattern library for future debugging.

## ABSOLUTE RULE: No Push or MR Without E2E Evidence

This rule is inherited from the human-agent-team skill and applies to the entire
fix cycle — from triage through implementation to merge.

When a triage leads to a fix implementation:

**NEVER `git push`, NEVER open an MR until:**
1. The fix is DEPLOYED to the real environment
2. The fix is TESTED end-to-end through the actual user flow
3. Evidence is CAPTURED — screenshots for UI changes, response logs for backend changes
4. Only then: push, MR

Local commits on a branch are fine as checkpoints — they save your work. But a commit does NOT mean the fix is ready to share. Push + MR is the hard gate.

The triage skill's "Evidence Before Action" tenet applies to diagnosis.
This rule extends it to the ENTIRE lifecycle: diagnosis needs evidence,
AND the fix needs E2E evidence before it can be pushed.

Build passes + QA logic review = necessary but NOT sufficient.
Deployed + E2E tested + evidence captured = sufficient.

See: `~/.kiro/skills/human-agent-team/SKILL.md` section 8 for the full rule.
