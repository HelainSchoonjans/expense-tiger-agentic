# User Preferences

_Last updated: 2026-03-28_

## Development Philosophy

- **MVP-first**: User explicitly wants first-time-right MVP, not boil-the-ocean. Cut features that add complexity without proportional value.
- **Autonomous agents**: User wants frontend and backend agents to work in parallel, each self-testing. Backend agent uses AWS CLI/API + CloudWatch logs to self-diagnose. Frontend agent uses Playwright/Chrome DevTools for E2E.
- **Contract-based parallel dev**: API contract is the boundary between frontend and backend agents. Neither needs to understand the other's implementation.
- **Testing is critical**: User emphasized testing because they want agents to implement without human help. TDD skill + integration tests + E2E tests are the safety net.
- **Skills-driven**: User created serverless-spa-* skills from a working app and expects them to accelerate development significantly. Always activate relevant skills.

## Over-Engineering Red Flags (User-Confirmed)

These were identified as over-engineered for MVP and user agreed to cut:
1. SQS async retry mechanism — just use try/catch in Lambda
2. X-Ray tracing — structured CloudWatch logs are enough
3. API Gateway access logging — Lambda logs cover it
4. 16 property-based tests — trim to 6-8 that catch real bugs
5. Regex fallback for Bedrock JSON parsing — Claude returns clean JSON with good prompts
6. Line item add/remove in expense editor — just edit existing extracted values for v1
