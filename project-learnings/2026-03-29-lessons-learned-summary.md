# Lessons Learned Summary — 2026-03-29

Session: Built a full-stack serverless expense submission app (Cognito, API GW, Lambda, DynamoDB, Bedrock, CloudFront) from zero to deployed and tested in ~4 hours using agentic development with Kiro.

---

## High Impact — Architecture & Process

0. **"Evidence Before Action" — the #1 debugging rule for human-agent teams** — The agent nearly went down two costly rabbit holes: (a) proposing an async SQS architecture because "Bedrock might be too slow" (it wasn't — 4s, not 30s), and (b) modifying CORS settings because the browser showed a CORS error (it was actually a Lambda crash from a deprecated model ID). Both times the human asked "how do you know?" and insisted on data first. This led to enabling full observability (API GW logs, CloudFront logs, Lambda logs) and creating a CLI latency test. Full RCA in `debugging.md` under "RCA — Agent Assumption-Driven Debugging".

1. **Parallel subagents work, parallel sessions don't** — Kiro queues separate chat sessions. To parallelize, use subagents within a single conversation. Both backend and frontend specs completed simultaneously this way.

2. **Shared API contract is mandatory for parallel work** — Backend and frontend subagents built incompatible wire formats (camelCase vs snake_case). Fix: create an OpenAPI spec as a single source of truth, plus a steering file that auto-activates when relevant files are edited.

3. **Enable observability from day one** — We wasted time debugging a "CORS error" that was actually a Lambda crash. Had we enabled API Gateway execution logs and CloudFront access logs from the start, diagnosis would have been instant. Now baked into the CDK stack.

4. **"Evidence Before Action" — the #1 rule for human-agent debugging** — The agent nearly made two costly mistakes: (a) proposing an async SQS architecture to fix a "Bedrock timeout" that didn't exist (actual latency: 4s), and (b) modifying CORS settings for a "CORS error" that was actually a Lambda crash from a deprecated model ID. Both times the human asked "how do you know?" and demanded data before changes. This led to: CLI latency tests, full observability stack, and a structured RCA using the `triage-issue` skill. Full RCA documented in `.kiro/memory/debugging.md` under "Agent Assumption-Driven Debugging". Agents are pattern matchers — they need humans to challenge assumptions.

4. **Agent-led development model** — Human owns "what" (architecture, decisions, credentials), agent owns "how" (code, tests, debugging, deployment, docs). This produced a full-stack serverless app in 4 hours — 90% faster than a traditional 3.25 FTE team estimate.

## Medium Impact — AWS/Technical Gotchas

5. **CORS errors mask Lambda failures** — When Lambda crashes, API Gateway returns a raw 5xx without CORS headers. The browser reports it as a CORS error. Always check Lambda logs first.

6. **Bedrock model IDs deprecate silently** — `anthropic.claude-3-sonnet-20240229-v1:0` became "Legacy" with no warning. Use cross-region inference profiles (`us.anthropic.claude-sonnet-4-6`) and verify with AWS docs MCP. No date suffix on Claude Sonnet 4.6.

7. **DynamoDB requires Decimal, not float** — boto3 resource API throws `TypeError` on floats. Convert via `Decimal(str(value))` — the `str()` intermediate avoids floating-point precision issues.

8. **Lambda defaults are too low for Bedrock** — Default 3s timeout and 128MB memory won't work. Set 60s / 512MB minimum for vision model calls. API Gateway caps at 29s integration timeout.

9. **CloudFront cache invalidation has a 1-5 minute delay** — After deploying frontend changes, tests may see stale content. Factor this into E2E test timing.

10. **AWS CLI `invoke-model --body` needs base64** — Not raw JSON. Easy to forget.

## Lower Impact — Workflow & Tooling

11. **GitLab `Closes #N` only works via Merge Requests** — Direct pushes to main link the commit to the issue but don't auto-close it. Use `glab issue close N --comment "..."` for direct-to-main workflows.

12. **`response.data` unwrapping pattern** — All backend responses wrap in `{data: ...}`. Every frontend component must unwrap. Easy to miss when adding new views.

13. **CDK `--outputs-file` path is relative to CWD** — Not the CDK project directory. Use absolute paths in deploy scripts.

14. **Skills live at user level (`~/.kiro/skills/`)** — Agent can't write there directly from a workspace. Workaround: write in workspace, then `cp` via bash. Delete the workspace copy after.

15. **Context transfer works well for long conversations** — Include task status, file paths, user corrections, deployed endpoints, and a "files to read" list. This session picked up seamlessly from the previous one.

16. **Productivity measurement is now a reusable skill** — `measure-devx-productivity` at user level. Dual-track methodology: actual git data vs traditional team estimate. Can be applied to any future project.
