# Decisions Log

_Last updated: 2026-03-28_

## 2026-03-28: Spec Creation Session

### Decision: Requirements-first workflow
- User chose "Build a Feature" → "Requirements" as starting point
- Spec at `.kiro/specs/expense-submission-app/`

### Decision: Add observability requirements to spec
- User requested structured logging, CloudWatch log groups, and tracing be added to requirements and design
- Added Requirements 9 (Observability), 10 (Backend Integration Testing), 11 (Frontend E2E Testing)
- Added Observability section to design with code patterns

### Decision: Update skills with observability and testing patterns
- Updated `~/.kiro/skills/serverless-spa-backend/SKILL.md` — added Observability/Logging/Tracing section + Backend Integration Testing section
- Updated `~/.kiro/skills/serverless-spa-deployment/SKILL.md` — added Post-Deployment Verification section
- Updated `~/.kiro/skills/tdd/SKILL.md` — added Serverless Integration Testing section (backend, frontend E2E, contract-based parallel dev)

### Decision: Trim MVP scope (APPLIED 2026-03-28)
- Cut from requirements, design, and all skills:
  - SQS retry mechanism → simple try/catch in Lambda
  - X-Ray tracing → CloudWatch logs are enough
  - API Gateway access logging → Lambda logs cover it
  - Regex fallback Bedrock parsing → just parse JSON, error if it fails
  - Line item add/remove in editor → just edit existing extracted values
  - Property-based tests reduced from 16 to 8 (kept: password validation, file validation, Bedrock parsing, total calculation, expense validation, record completeness, date ordering, user data isolation)
