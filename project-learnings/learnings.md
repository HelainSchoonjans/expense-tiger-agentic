# Learnings & Workflow Insights

_Most recent first. Each entry includes a date and time tag._

---

## 2026-04-18 16:00 — Playwright MCP on EC2 / Headless Linux Setup
<!-- session: 2026-04-18T16:00-expense-tiger-agentic -->

### What worked
- Agent-driven interactive testing via Playwright MCP is a distinct workflow from writing Playwright scripts — no code written, agent navigates conversationally
- The test flow pattern: navigate → snapshot → click/fill → snapshot → repeat
- Screenshots are the only observation window into the headless browser — user can request them at any point

### EC2 / headless Linux gotchas
- `npm install -g aws-cdk` fails with `EACCES` on EC2 — this is an OS permission issue, not AWS IAM. Fix: `sudo npm install -g aws-cdk` or `npm install -g --prefix ~/.local aws-cdk`
- Playwright MCP server expects Chrome at `/opt/google/chrome/chrome` but Playwright installs Chromium elsewhere (`~/.cache/ms-playwright/`). Fix: symlink — `sudo mkdir -p /opt/google/chrome && sudo ln -sf ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome /opt/google/chrome/chrome`
- Chromium on headless Linux needs system libraries. Amazon Linux: `sudo yum install -y atk at-spi2-atk cups-libs libxcb libxkbcommon alsa-lib mesa-libgbm libX11 libXext cairo pango libXcomposite libXdamage libXfixes libXrandr at-spi2-core`. Ubuntu: `sudo npx playwright install-deps chromium`

### When to use Playwright MCP vs native scripts
- **Playwright MCP**: exploratory/interactive testing, quick verification after deploys, visual debugging, one-off checks
- **Native Playwright scripts**: repeatable CI/CD test suites, regression testing, automated pipelines

### Skill update signal
- The `webapp-testing` skill only covers native Python Playwright scripts. It should also cover the Playwright MCP agent-driven workflow, including the EC2 setup gotchas and the decision tree for choosing between the two approaches.

---

## 2026-03-30 13:15 — Automated Documentation via MCP Tools

Two MCP tools enable fully agent-driven documentation with no human effort:

### Architecture diagrams — `awslabs.aws-diagram-mcp-server`
- Generates PNG diagrams using the Python `diagrams` package with official AWS icons
- Disabled by default — enable in `.kiro/settings/mcp.json` when needed
- Icons are referenced by name directly (e.g., `CloudFront`, `Lambda`, `Bedrock`), not namespaced (`aws.network.CloudFront` won't work)
- Use `list_icons(provider_filter="aws", service_filter="compute")` to discover available icon names
- Use `get_diagram_examples(diagram_type="aws")` for syntax reference
- Output goes to `generated-diagrams/` by default — move to `docs/` for cleaner project structure

### UX screenshots — Playwright MCP (`@playwright/mcp`)
- Agent navigates the live deployed app, interacts with UI (sign in, upload files, click buttons), and takes screenshots
- `browser_take_screenshot` with `filename` parameter saves directly to project folder
- Use `fullPage: true` for pages with scrollable content (e.g., expense editor with line items)
- Workflow: sign out → screenshot auth pages → sign in → screenshot each view in sequence
- Both tools together produce a complete visual documentation set (architecture + UX) without any manual work

---

## 2026-03-29 01:30 — Context Transfer Across Long Conversations

- When a conversation gets too long, Kiro supports context transfer via a structured summary
- The summary should include: task status, file paths, user corrections, deployed endpoints, and a "files to read" list
- This session was a continuation — the context transfer worked well, agent picked up exactly where it left off
- Key: include user preferences and corrections in the transfer (e.g., "don't make assumptions", "skills are at user level")

---

## 2026-03-29 01:15 — Workspace vs User-Level File Access

- Agent can only write files within the workspace root
- User-level paths (`~/.kiro/skills/`, `~/.kiro/hooks/`) require a workaround: write to workspace first, then `cp` via bash
- Skills should always be installed at user level for cross-project reuse
- Workspace copies of skills are redundant and should be deleted after copying to user level

---

## 2026-03-29 01:00 — Productivity Measurement Skill

Created `measure-devx-productivity` skill at `~/.kiro/skills/measure-devx-productivity/`.
- Uses a Dual-Track Estimation methodology: measure actual agentic data (git history, task counts, code volume) vs estimate traditional team effort (bottom-up by work area + coordination overhead)
- Key metrics: TTM improvement, effort reduction, cost savings, effective team leverage
- Applied it to this project: 90.5% faster TTM, 88% effort reduction, 3.25× team leverage
- Report generated at `agentic-devx-productivity-report.md` in project root, referenced from README
- Lesson: skills that live at user level (`~/.kiro/skills/`) can't be written directly by the agent from a workspace — need to write in workspace first, then `cp` to user level

---

## 2026-03-29 00:30 — GitLab Issue Workflow

- Created 3 GitLab issues for known bugs found during testing
- `glab` CLI tool can be installed via `brew install glab` for creating issues from terminal
- For simple workflows (no branches/MRs), committing directly to main with issue references is fine
- Issues serve as formal documentation of known bugs on a checked-in version

### Auto-close gotcha
- `Closes #N` in commit messages only auto-closes issues when the commit is merged via a Merge Request (MR) into the default branch
- Direct pushes to `main` do NOT trigger auto-close — GitLab ignores closing keywords in regular pushes
- However, referencing `#N` in a commit message DOES create a link in the issue's activity feed (commit shows up as related)
- For direct-to-main workflow, close issues manually:
  ```bash
  glab issue close 1 --comment "Fixed in commit <sha> — description"
  ```
- Lesson: linking works without MRs, auto-closing does not

---

## 2026-03-28 23:00 — Bedrock Model ID Management

- Old models get deprecated silently — `ResourceNotFoundException` with "Legacy" message
- Claude Sonnet 4.6 model ID: `us.anthropic.claude-sonnet-4-6` (no date suffix)
- Cross-region inference profiles (`us.`, `eu.`, `au.`, `global.`) recommended for production
- Updated `~/.kiro/skills/serverless-spa-bedrock/SKILL.md` with correct model ID
- Created `tests/backend/test-bedrock-aws-cli.sh` for quick model verification

---

## 2026-03-28 22:30 — Parallel Spec Execution

Attempted to parallelize backend and frontend work:
- Approach 1 (separate sessions): Failed — Kiro queues sessions sequentially
- Approach 2 (subagents in one conversation): Worked — both completed simultaneously
- Key: give both tasks in a single message, agent delegates to parallel subagents
- Limitation: subagents share the filesystem, so they must write to different directories (lambda/ vs frontend/)

---

## 2026-03-28 20:30 — Agent-Led Development Model

Key insight from building the expense app end-to-end in a single session:

### What worked well
- Spec-driven development: requirements → design → tasks gave the agent clear scope and the human clear checkpoints
- Parallel subagent execution: backend + frontend specs ran simultaneously within one conversation (not across sessions — Kiro queues separate sessions)
- Interactive browser testing via Playwright MCP: agent signs in, uploads files, checks console errors — no human copy-pasting needed
- CloudWatch log reading via AWS CLI: agent diagnoses backend errors autonomously
- Memory skill: accumulated debugging insights that persist across sessions
- Skill updates: when the bedrock skill had an outdated model ID, agent updated it for all future projects

### What didn't work / lessons learned
- Separate chat sessions don't run in parallel — they queue. Use subagents within a single conversation instead.
- CORS errors on API Gateway are almost always a symptom of Lambda failure, not actual CORS misconfiguration. Always check Lambda logs first.
- Bedrock model IDs change over time. Legacy models get access-denied. Always use cross-region inference profiles (`us.` prefix) and verify with AWS docs MCP.
- AWS CLI `invoke-model --body` requires base64-encoded input, not raw JSON.
- CDK `cdk deploy --outputs-file` path is relative to CWD, not the CDK project dir. Use absolute paths.
- Default Lambda timeout (3s) is way too short for Bedrock calls. Set 60s minimum for vision models.
- API Gateway REST API max integration timeout is 29s. For longer operations, need async pattern (SQS + polling).

### Human-agent collaboration model
- Human defines "what" (expense tracker with Bedrock extraction)
- Agent handles "how" (CDK, Lambda, frontend, tests, deployment)
- Human reviews approach, pushes back on assumptions, provides credentials
- Agent leads testing, debugging, log analysis, skill updates
- Human doesn't need to: copy-paste logs, manually test in browser, look up AWS docs, write boilerplate
- Agent doesn't need to: make architectural decisions, choose between competing approaches, decide when to stop

### Testing approach
- Backend: pytest against live deployment (stack outputs, CORS, auth gate, CloudWatch logs)
- Frontend: Playwright E2E (headless for CI, headed for debugging) + agent interactive testing via Playwright MCP
- Bedrock: CLI-based bash script for isolated model testing (text + image, with timing)
- CDK: Unit tests with Template assertions (33 tests)
