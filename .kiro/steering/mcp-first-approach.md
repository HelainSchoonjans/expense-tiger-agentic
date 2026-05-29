---
inclusion: always
version: 2026-03-29-18:30-v0.1.0
author: Hasan-Basri AKIRMAK (akirmak@)
changelog:
  - 2026-03-29 18:30 v0.1.0 — Initial version with MCP server routing table and task-to-server mapping.
---

# MCP-First Approach for AWS Development

When working with AWS services, always consult the relevant MCP server(s) before writing code. This ensures implementations are grounded in current documentation, APIs, and best practices.

Terminal Configuration (CRITICAL)
ALWAYS use WSL2 zsh/bash commands
NEVER use PowerShell or cmd syntax
Use Unix syntax for ALL commands
Forward slashes in all paths

## Workflow

1. Identify which AWS service(s) the task involves
2. Pick the right MCP server(s) from the routing table below
3. Query for docs, APIs, examples, or current state
4. Then write the code

## Server Routing Table

### awslabs.aws-documentation-mcp-server (enabled)

General-purpose AWS docs lookup. Use for any AWS service documentation.

Tools: `search_documentation`, `read_documentation`, `read_sections`, `recommend`

When to use:
- Looking up any AWS service guide, API reference, or getting-started content
- Finding best practices, limits, quotas, or configuration instructions
- Researching a service you haven't used before
- Getting recommendations for related documentation pages

When NOT to use:
- For CDK/CloudFormation construct APIs → use IaC server
- For executing AWS CLI commands → use API server
- For SDK method signatures → use Context7
- For AgentCore samples/SDK code → use gitmcp servers

### awslabs.aws-iac-mcp-server (enabled)

Infrastructure as Code toolkit — CDK, CloudFormation, compliance, and deployment troubleshooting.

Tools:
- `search_cdk_documentation` — CDK construct APIs and patterns
- `search_cloudformation_documentation` — CloudFormation resource types and properties
- `search_cdk_samples_and_constructs` — Working CDK code examples and L3 constructs
- `cdk_best_practices` — Security guidelines and architectural recommendations
- `read_iac_documentation_page` — Read full content from CDK/CFN doc pages
- `validate_cloudformation_template` — Lint and validate CFN templates (cfn-lint)
- `check_cloudformation_template_compliance` — Security/compliance validation (cfn-guard)
- `troubleshoot_cloudformation_deployment` — Root cause analysis for failed deployments
- `get_cloudformation_pre_deploy_validation` — Pre-deployment validation guidance

When to use:
- Writing ANY CDK or CloudFormation code
- Looking up construct APIs, resource properties, or L2/L3 patterns
- Validating templates before deployment
- Troubleshooting failed CloudFormation stacks
- Checking CDK best practices or cdk-nag compliance rules
- Finding CDK code samples in TypeScript, Python, Java, C#, or Go

### awslabs.aws-api-mcp-server (enabled)

Execute AWS CLI commands directly. Supports batch execution and cross-region operations.

Tools: `suggest_aws_commands`, `call_aws`

When to use:
- Verifying current AWS resource state (list instances, describe stacks, etc.)
- Executing AWS operations (create, update, delete resources)
- Testing or validating configurations against live infrastructure
- Running any AWS CLI command with proper validation
- Cross-region operations (use `--region *` for all regions)

When NOT to use:
- For documentation lookup → use docs or IaC server
- When confident about the command → use `call_aws` directly, skip `suggest_aws_commands`

### context7 (enabled)

Library documentation lookup for AWS SDKs and any programming library.

Tools: `resolve_library_id`, `query_docs`

When to use:
- Working with AWS SDKs (boto3, @aws-sdk/*, aws-cdk-lib, etc.)
- Needing current SDK method signatures, parameters, and usage examples
- Looking up any third-party library API (not just AWS)

Workflow: always call `resolve_library_id` first to get the library ID, then `query_docs`.

### gitmcp — Bedrock AgentCore Samples (enabled)

Live access to the `aws-samples/amazon-bedrock-agentcore-samples` GitHub repo.

Tools: `fetch_*_documentation`, `search_*_documentation`, `search_*_code`, `fetch_url_content`

When to use:
- Building with Bedrock AgentCore (agents, runtimes, memory, identity, gateway, observability)
- Looking for working sample code, patterns, or reference implementations
- Checking how a specific AgentCore feature is used in practice

### gitmcp — Bedrock AgentCore Python SDK (enabled)

Live access to the `awslabs/amazon-bedrock-agentcore-python-sdk` GitHub repo.

Tools: `fetch_*_documentation`, `search_*_documentation`, `search_*_code`, `fetch_url_content`

When to use:
- Writing Python code that uses the AgentCore SDK
- Looking up SDK classes, methods, parameters, and usage patterns
- Understanding the SDK's API surface and capabilities

### gitmcp — Dynamic / Any Repo (enabled)

On-demand access to ANY public GitHub repo via `gitmcp.io/docs`.

Tools: `fetch_generic_documentation`, `search_generic_documentation`, `search_generic_code`, `fetch_generic_url_content`

When to use:
- User provides a GitHub repo URL and wants to reference its docs/code
- You discover a relevant open-source project during web search
- Working with a library that isn't covered by the other MCP servers
- Need to check a specific repo's README, examples, or implementation details

How it works: the AI decides which repo to target based on context. Provide the owner/repo when prompting.

### bedrock-agentcore-mcp-server (disabled — enable when needed)

Specialized documentation for Amazon Bedrock AgentCore platform (official AWS docs, not GitHub).

Tools: `search_agentcore_docs`, `fetch_agentcore_doc`

When to use:
- Looking up official AgentCore API references and service documentation
- Need authoritative docs beyond what the GitHub samples provide

Note: Currently disabled. The gitmcp servers above cover most AgentCore needs. Enable this for official API reference lookups.

### awslabs.aws-diagram-mcp-server (disabled — enable when needed)

Generate AWS architecture diagrams.

Tools: `list_icons`, `get_diagram_examples`

When to use:
- Creating architecture diagrams for AWS solutions

## Task-to-Server Mapping

| Task | Primary Server | Also consult |
|------|---------------|--------------|
| Write CDK/CloudFormation code | IaC server | Docs server for service guidance |
| Validate a CFN template | IaC server (`validate_cloudformation_template`) | |
| Check CFN compliance | IaC server (`check_cloudformation_template_compliance`) | |
| Debug a failed CFN deployment | IaC server (`troubleshoot_cloudformation_deployment`) | |
| Write Lambda handler code | Docs server | Context7 for SDK methods |
| Write boto3 / AWS SDK code | Context7 | Docs server for service concepts |
| Build a Bedrock agent | gitmcp AgentCore samples + SDK | Docs server for concepts, IaC for CDK |
| Build AgentCore runtime | gitmcp AgentCore SDK | gitmcp samples for examples |
| Build a RAG application | Docs server (Bedrock KB, OpenSearch) | IaC server for infrastructure |
| Set up DynamoDB table | IaC server (CDK construct) | Docs server for data modeling |
| Configure API Gateway | IaC server (CDK construct) | Docs server for auth/throttling |
| Work with SageMaker | Docs server | Context7 for SageMaker SDK |
| Set up ECS/Fargate | IaC server (CDK construct) | Docs server for task definitions |
| Check current AWS resources | API server (`call_aws`) | |
| Estimate AWS costs | Docs server (pricing pages) | API server for current usage |
| Design architecture | Docs server | Diagram server if visual needed |
| Implement auth (Cognito) | Docs server | IaC server for CDK constructs |
| Set up monitoring (CloudWatch) | Docs server | API server to check current alarms |
| Work with Step Functions | Docs server (ASL syntax) | IaC server for CDK constructs |
| Build with S3 | IaC server (CDK construct) | Docs server for features/policies |
| Work with SQS/SNS | Docs server | IaC server for CDK constructs |
| Reference a GitHub project | gitmcp dynamic (`gitmcp.io/docs`) | |
| Use an open-source library | gitmcp dynamic or Context7 | |

## Rules

- Never skip the lookup step, even if you think you know the API. Services evolve.
- When multiple servers are relevant, query them in parallel.
- For IaC tasks, always run `cdk_best_practices` at least once per session.
- For CFN templates, validate with both `validate_cloudformation_template` (syntax) and `check_cloudformation_template_compliance` (security) before suggesting deployment.
- If an MCP lookup returns nothing useful, fall back to `web_search`.
- Cite the documentation source when the implementation is directly informed by a specific doc page.
- If a task requires a disabled server (AgentCore docs, Diagram), mention it and suggest enabling.
- When the user provides a GitHub URL or you find a relevant repo, use the gitmcp dynamic server to pull its docs/code before writing implementation.
- For Bedrock AgentCore work, always check the gitmcp samples server first for working examples, then the SDK server for API details.
