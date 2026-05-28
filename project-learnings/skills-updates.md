# Skills Updates Log

_Last updated: 2026-03-28_

Skills are at `~/.kiro/skills/` (user-level, shared across workspaces).

## 2026-03-28: Observability and Testing Additions

### serverless-spa-backend/SKILL.md
- Added: Observability, Logging, and Tracing section
  - Structured JSON logging pattern (Python)
  - Per-invocation context logging (request_id, user_id, http_method, path)
  - External service call logging with latency
  - Error logging with stack traces
  - CDK: explicit CloudWatch log groups (14-day retention, DESTROY)
  - CDK: X-Ray tracing on Lambda + API Gateway
  - CDK: API Gateway JSON access logging
  - Agent self-diagnosis via `aws logs filter-log-events`
- Added: Backend Integration Testing section
  - Deployment verification (stack outputs, Cognito, log groups)
  - Service smoke tests (CORS, auth gate, Bedrock, CRUD)
  - Self-healing loop pattern

### serverless-spa-deployment/SKILL.md
- Added: Post-Deployment Verification section
  - Automated verification checklist (stack status, outputs, log groups, API, CORS, CloudFront, S3)
  - Observability verification (X-Ray, access logging)
  - Diagnosing deployment failures via CloudWatch

### tdd/SKILL.md
- Added: Serverless Integration Testing section
  - Backend integration tests (post-deploy, AWS CLI-based)
  - Frontend E2E tests (Playwright/Chrome DevTools)
  - Contract-based parallel development pattern
