---
inclusion: always
version: 2026-05-03-10:51-v0.3.0
author: Hasan-Basri AKIRMAK (akirmak@)
description: Defines which tools the agent should auto-approve vs confirm with the human. Shapes general agent behavior across all tasks — read-only tools are trusted automatically, while tools that modify files, run commands, or send data require confirmation.
changelog:
  - 2026-05-03 10:51 v0.3.0 — Added Kiro IDE trusted commands section documenting the `kiroAgent.trustedCommands` setting for shell command auto-approval in the IDE.
  - 2026-04-17 11:14 v0.2.0 — Added GitHub MCP tools (read-only to Tier 1, write to Tier 2). Added knowledge tool with split treatment (search/show/status → Tier 1, add/remove/clear/update/cancel → Tier 2). Added todo_list to Tier 1. Added subagent to Tier 2. Updated startup commands.
  - 2026-03-29 18:30 v0.1.0 — Initial version with tool trust tiers. Changed from manual to always inclusion.
---

# Kiro Trust Model

## Principle
Trust all read-only tools automatically. Require confirmation for any tool that modifies files, runs commands, or sends data.

## Session Startup Commands

Paste these at the start of each kiro-cli session:

### 1. Native (built-in) tools

```
/tools trust fs_read grep glob code web_search web_fetch introspect session report_issue todo_list knowledge
```

> **Note:** `knowledge` and `todo_list` are trusted as tools, but only their read-only operations (show/search/status for knowledge, list for todo_list) are truly side-effect-free. The write operations (add/remove/clear/update) will still execute without confirmation when the tool itself is trusted. Accept this tradeoff or remove them from the trust command if you want confirmation on every knowledge/todo mutation.

### 2. MCP read-only tools — AWS (Sentral, Outlook, Docs)

```
/tools trust search_documentation read_documentation read_sections recommend search_accounts search_contacts search_opportunities search_events search_tasks search_campaigns search_leads search_pfrs search_tags search_users search_territories search_products fetch_account_details fetch_contact_details fetch_event_details fetch_lead_details fetch_task_details fetch_territory_details fetch_campaign_details fetch_pfr_details fetch_customer_influence_details get_opportunity_details get_opportunity_contact_roles get_opportunity_line_items get_opportunity_tags get_my_personal_details get_registry_assignments get_account_spend_summary get_account_spend_history get_account_spend_by_service list_product_categories list_territories list_territory_accounts list_user_assigned_accounts list_user_assigned_territories sift_insights_search sift_insights_fetchById sift_insights_listMyInsights sift_insightTemplates_search calendar_view calendar_search calendar_shared_list calendar_availability email_inbox email_read email_search email_folders email_list_folders email_categories email_contacts email_attachments todo_lists todo_tasks todo_checklist
```

### 3. MCP read-only tools — GitHub

```
/tools trust get_file_contents get_issue get_pull_request get_pull_request_files get_pull_request_comments get_pull_request_reviews get_pull_request_status list_commits list_issues list_pull_requests search_code search_issues search_repositories search_users
```

## Why `ls` Still Asks for Permission

`/tools trust` operates at the **tool level**, not the command level. When you trust `fs_read`, `grep`, or `glob`, those dedicated tools run without prompts because they're single-purpose and read-only. But `ls`, `cat`, `npm install`, and `rm -rf` all run through the same tool: `execute_bash`. Trusting that tool means trusting *every* shell command — there's no way to allow `ls` but block `rm -rf` at the trust layer.

This creates friction: you'll be prompted for harmless commands like `ls ./kiro` or `cat package.json` because they share a tool with destructive ones.

**Your options:**

1. **Keep the friction** (default) — confirm each shell command individually. Safest, but annoying for exploratory work.
2. **Trust the shell tool** — add `execute_bash` to your startup commands. Eliminates all shell prompts. The `git-sh-kiro-guardrails` skill still blocks the worst commands (`push --force`, `reset --hard`, `rm -rf`, `chmod 777`) via its `preToolUse` hook, so you have a safety net. Add this to your startup if you choose this path:
   ```
   /tools trust execute_bash
   ```
3. **Use dedicated tools instead of shell** — the agent should prefer `fs_read` over `cat`, `glob` over `ls`, `grep` over `grep`. The steering already instructs this, but the agent sometimes falls back to shell. If you see it using `ls` when `glob` would work, that's an agent behavior to improve, not a trust model gap.

**Recommendation:** Option 2 + the guardrails skill. The guardrails hook catches destructive commands before execution, giving you defense-in-depth even with the shell tool trusted.

## Trust Tiers

### Tier 1 — Auto-Trusted (read-only, no side effects)

| Tool | Source | Rationale |
|------|--------|-----------|
| fs_read | Native | Read files/dirs only |
| grep | Native | Text search only |
| glob | Native | Path matching only |
| code | Native | Code intelligence, AST search |
| web_search | Native | Web lookup only |
| web_fetch | Native | Fetch URL content only |
| introspect | Native | Kiro self-docs |
| session | Native | Temp settings, reset on exit |
| report_issue | Native | Opens browser to GitHub |
| todo_list | Native | Internal task tracking, no external side effects |
| knowledge (show, search, status) | Native | Read-only KB queries (see note on split treatment) |
| search_*, fetch_*, get_*, list_* | MCP (aws-sentral) | CRM read-only queries |
| sift_insights_search, sift_insights_fetchById, sift_insights_listMyInsights, sift_insightTemplates_search | MCP (aws-sentral) | SIFT read-only |
| calendar_view, calendar_search, calendar_shared_list, calendar_availability | MCP (aws-outlook) | Calendar read-only |
| email_inbox, email_read, email_search, email_folders, email_list_folders, email_categories, email_contacts, email_attachments | MCP (aws-outlook) | Email read-only |
| todo_lists, todo_tasks, todo_checklist | MCP (aws-outlook) | To-do read-only |
| search_documentation, read_documentation, read_sections, recommend | MCP (aws-docs) | AWS docs read-only |
| get_file_contents | MCP (GitHub) | Read repo files only |
| get_issue, list_issues, search_issues | MCP (GitHub) | Read-only issue access |
| get_pull_request, get_pull_request_files, get_pull_request_comments, get_pull_request_reviews, get_pull_request_status, list_pull_requests | MCP (GitHub) | Read-only PR access |
| list_commits | MCP (GitHub) | Read-only commit history |
| search_code, search_repositories, search_users | MCP (GitHub) | Read-only GitHub search |

### Tier 2 — Ask Every Time (modifies state)

| Tool | Source | Risk | Rationale |
|------|--------|------|-----------|
| fs_write | Native | 🟠 Medium | Creates/edits files on disk |
| execute_bash | Native | 🔴 High | Arbitrary shell commands |
| subagent | Native | 🟡 Low-Med | Spawns parallel agents |
| knowledge (add, remove, clear, update, cancel) | Native | 🟠 Medium | Mutates KB index |
| create_*, update_*, add_*, remove_* | MCP (aws-sentral) | 🟠 Medium | Mutates CRM records |
| sift_insights_create, sift_insights_update, sift_insights_delete | MCP (aws-sentral) | 🟠 Medium | Mutates SIFT insights |
| sift_assistant_*, sift_conversation_* | MCP (aws-sentral) | 🟡 Low-Med | AI enrichment/conversation |
| email_send, email_reply, email_forward, email_draft, email_move, email_update | MCP (aws-outlook) | 🟠 Medium | Sends/modifies email |
| calendar_meeting (create/update/delete) | MCP (aws-outlook) | 🟠 Medium | Modifies calendar |
| calendar_room_booking | MCP (aws-outlook) | 🟡 Low | Books rooms |
| use_aws | Native | 🔴 High | AWS API calls |
| create_branch | MCP (GitHub) | 🟡 Low-Med | Creates branches |
| create_or_update_file, push_files | MCP (GitHub) | 🟠 Medium | Writes to repo |
| create_issue, update_issue, add_issue_comment | MCP (GitHub) | 🟡 Low-Med | Creates/modifies issues |
| create_pull_request, create_pull_request_review | MCP (GitHub) | 🟡 Low-Med | Opens PRs, submits reviews |
| merge_pull_request | MCP (GitHub) | 🔴 High | Merges PRs — irreversible |
| update_pull_request_branch | MCP (GitHub) | 🟡 Low-Med | Updates PR branch from base |
| create_repository, fork_repository | MCP (GitHub) | 🟡 Low-Med | Creates/forks repos |

## How to Apply Trust

### Option A: Paste commands each session (recommended)
Copy/paste the three `/tools trust` commands above at the start of each session. Session-only, resets on exit.

### Option B: Load this doc as context
```
/context add ~/.kiro/steering/kiro-trust-model.md
```
This lets the AI see the trust model but does NOT auto-execute the trust commands. You still need to paste them manually.

### Option C: CLI flags at launch
```bash
kiro-cli chat --trust-tools=fs_read,grep,glob,code,web_search,web_fetch,introspect,session,report_issue,todo_list,knowledge
```
Pre-trusts native tools at startup. Add MCP tool names comma-separated to include those too.

### Option D: Permanent trust via agent config
Add tools to `allowedTools` in your agent JSON (e.g., `~/.kiro/agents/your-agent.json`):
```json
{
  "allowedTools": [
    "fs_read", "grep", "glob", "code", "web_search", "web_fetch",
    "introspect", "session", "report_issue", "todo_list", "knowledge",
    "search_documentation", "read_documentation", "read_sections", "recommend",
    "search_accounts", "search_contacts", "search_opportunities",
    "get_file_contents", "get_issue", "get_pull_request", "list_commits",
    "list_issues", "list_pull_requests", "search_code", "search_issues",
    "search_repositories", "search_users",
    "..."
  ]
}
```
These are trusted automatically in every session using that agent — no pasting needed.

### Option E: Trust everything
```
/tools trust-all
```
Or launch with `kiro-cli chat --trust-all-tools`. Trusts all tools including writes — use with caution.

## Kiro IDE: Trusted Commands

In Kiro IDE (as opposed to Kiro CLI), shell command trust is managed via the `kiroAgent.trustedCommands` setting in the IDE's Settings UI. This is the IDE equivalent of `/tools trust execute_bash` — but with **per-command granularity** using wildcard patterns.

**Setting:** `kiroAgent.trustedCommands`
**Location:** Settings → search "trustedCommands" → User or Workspace scope

Each entry is a shell command prefix with a `*` wildcard. The agent auto-approves any shell command matching a trusted pattern; all others require confirmation.

**Current trusted commands (User scope):**

```
# Package managers & runtimes
npx *          npm *          yarn *         node *         python *

# Build tools
tsc *          cdk *

# Read-only shell (safe)
ls *           cat *          head *         tail *         grep *
find *         wc *           which *        diff *         echo *
date *

# File operations (low risk)
cp *           mv *           mkdir *        zip *

# Git (read-only + general)
git log *      git diff *     git status *   git -C *       
```

**Key differences from Kiro CLI trust model:**

| Aspect | Kiro CLI | Kiro IDE |
|--------|----------|----------|
| Granularity | Tool-level (`execute_bash` = all or nothing) | Command-level (per prefix pattern) |
| Persistence | Session-only (paste each time) or agent config | Persisted in IDE settings (User or Workspace) |
| Shell safety | Relies on guardrails skill hook | Built-in per-command filtering + guardrails skill |
| Read-only shell | Can't selectively trust `ls` but block `rm` | Can trust `ls *` without trusting `rm *` |

**Note:** The IDE setting solves the "Why `ls` Still Asks for Permission" problem described above — you can trust `ls *`, `cat *`, `grep *` individually without trusting all shell commands. The guardrails skill still acts as a second safety net for destructive commands.

## Maintenance

When MCP servers or autoApprove lists change in `~/.kiro/settings/mcp.json`, regenerate the startup commands to stay in sync. The GitHub MCP server tools should be reviewed when new GitHub operations become available.

## Companion: git-sh-kiro-guardrails Skill

This trust model defines the policy (what to auto-approve vs confirm). For active enforcement of dangerous commands, the `git-sh-kiro-guardrails` skill and its `block-dangerous-commands.kiro.hook` act as a safety net — blocking destructive git and shell commands (push, reset --hard, rm -rf, chmod 777, etc.) before execution via a `preToolUse` hook. Recommended to keep both active together.
