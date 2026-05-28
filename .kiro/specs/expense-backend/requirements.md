# Requirements: Expense Backend (Lambda Functions)

## Context

This spec covers the backend Lambda functions for the Expense Submission App. The CDK infrastructure is already deployed (see `.kiro/specs/expense-submission-app/`). The API Gateway, DynamoDB table, Cognito User Pool, and CloudWatch Log Groups are all provisioned.

Deployed stack outputs (from `cdk-outputs.json`):
- API Endpoint: https://9dw70dsk6l.execute-api.us-east-1.amazonaws.com/prod/
- User Pool ID: us-east-1_NrQYz939C
- User Pool Client ID: 6stanr132kv6tq9dhkbpfjpdp6

## Scope

Backend Python Lambda handlers only:
- `lambda/extract/handler.py` — Receipt extraction via Bedrock
- `lambda/expenses/handler.py` — Expense CRUD operations
- `lambda/shared/` — Shared logging module
- Backend integration tests

## Requirements

Inherited from parent spec (Requirements 3, 5, 6.3, 7.3, 9, 10):
- Requirement 3: Receipt Detail Extraction via Bedrock
- Requirement 5: Expense Persistence
- Requirement 6.3: Expense list ordering (date descending)
- Requirement 7.3: User data isolation (scoped by Cognito sub)
- Requirement 9: Backend Observability and Logging
- Requirement 10: Backend Integration Testing

See `.kiro/specs/expense-submission-app/requirements.md` for full details.
