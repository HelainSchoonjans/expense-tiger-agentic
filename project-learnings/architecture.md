# Architecture Notes

_Last updated: 2026-03-28_

## Expense Submission App

- **Frontend**: Vanilla JS SPA, hash-based routing (#/auth, #/upload, #/edit, #/expenses)
- **Backend**: 2 Python Lambdas — extract_handler.py (Bedrock) + expenses_handler.py (CRUD)
- **API**: 3 endpoints — POST /expenses/extract, POST /expenses, GET /expenses
- **Auth**: Cognito User Pool with SRP, JWT in Authorization header
- **DB**: DynamoDB single-table, PK=userId (Cognito sub), SK=expenseId (UUID)
- **AI**: Bedrock Claude for receipt image → structured JSON extraction
- **Image upload**: Base64-encoded in JSON body (not pre-signed S3 URLs) — keeps MVP simple, 5MB limit stays within API Gateway 10MB payload limit
- **Bedrock call**: Synchronous in Lambda (no SQS async layer for MVP)
- **Observability**: Structured JSON logging, explicit CloudWatch log groups (14-day retention), LOG_LEVEL env var
- **Testing**: Property-based (fast-check frontend, Hypothesis backend) + integration tests post-deploy + E2E via Playwright/Chrome DevTools
