![Workshop Logo](workshop-logo.png)

# Welcome to: Future of Software Engineering with Agentic AI

You're in a cloud-based development environment with **Kiro CLI** pre-installed — an agentic AI tool that enables spec-driven development, context engineering, and human-agent collaboration.

[Original Workshop URL](https://catalog.us-east-1.prod.workshops.aws/workshops/64829414-4bff-414b-952d-b073102fe471/en-US)

## Getting Started

All the info you need is in the workshop guide. Follow the modules to deploy a real serverless application, walk through specs and steering files, run a full bug fix cycle, and measure productivity impact.

## Step 1: Login to Kiro CLI (Terminal)

1. **Open a terminal** by clicking **Terminal** in the top menu, then **New Terminal**
2. **Type this command** and press Enter:
   ```
   kiro-cli login --use-device-flow
   ```
3. **Select "Use with Builder ID"** when prompted
4. **Follow the device flow authentication process**:
   - Copy the device code shown in the terminal
   - Open the provided URL in your browser (on your local machine)
   - Enter the device code and complete authentication
5. **Return to the terminal** — you should see a success message

## Step 2: Test Kiro CLI

1. **In the terminal, type**:
   ```
   kiro-cli
   ```
2. **When the Kiro prompt appears, type your question**:
   ```
   What is agentic coding, and how is it different from vibe coding?
   ```
3. **Important**: If Kiro asks for permissions, **type `t`** to trust and allow access

## Step 3: Continue with the Workshop Guide

Follow the instructions in the workshop guide. The first hands-on task is deploying the Expense Tiger app in **Part I — Module 1: Foundations**.

## Your Environment

### Pre-installed Tools

| Tool | Purpose |
|------|---------|
| **Kiro CLI** | Agentic AI coding assistant |
| **Node.js 18+** | CDK, frontend tooling |
| **Python 3.12** | Lambda handlers, pytest |
| **AWS CDK** | Infrastructure as Code |
| **Playwright + Chromium** | Browser automation and E2E testing |
| **uv / uvx** | Python package manager (runs MCP servers) |

### Pre-installed Skills (`~/.kiro/skills/`)

| Skill | Purpose |
|-------|---------|
| `human-agent-team` | Collaboration framework (task classification, PR workflow, evidence gates) |
| `triage-issue` | Bug investigation and TDD fix planning |
| `learn` | Long-term memory and self-improving workflows |
| `grill-me` | Stress-test plans and designs |
| `measure-devx-productivity` | Quantify agentic vs traditional productivity |
| `webapp-testing` | Browser-based testing with Playwright |
| `tdd` | Test-driven development workflow |
| `code-review` | Structured code review |
| `mcp-builder` | Build MCP servers |
| `improve-codebase-architecture` | Find refactoring opportunities |
| `doc-coauthoring` | Co-author documentation |

### Pre-configured MCP Servers (`.kiro/settings/mcp.json`)

| Server | Purpose |
|--------|---------|
| AWS Documentation | Search and read AWS docs |
| AWS API | Execute AWS CLI commands |
| AWS IaC | CDK/CloudFormation guidance |
| Playwright | Browser automation and testing |
| Context7 | Live library documentation |
| Fetch | General URL fetching |
| GitMCP Docs | Any GitHub repo as MCP |

## Expense Tiger App

This workspace contains the **Expense Tiger** application — a serverless expense management app built entirely with agentic AI. It serves as the hands-on workload for the workshop labs.

For full app documentation (architecture, deployment, testing, troubleshooting), see [README_EXPENSE_APP.md](README_EXPENSE_APP.md).
