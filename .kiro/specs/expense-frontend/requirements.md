# Requirements: Expense Frontend (Vanilla JS SPA)

## Context

This spec covers the frontend SPA for the Expense Submission App. The CDK infrastructure is already deployed (see `.kiro/specs/expense-submission-app/`). CloudFront, S3, Cognito, and API Gateway are all provisioned.

Deployed stack outputs:
- Website URL: https://d1yapy3ns1dho3.cloudfront.net
- API Endpoint: https://9dw70dsk6l.execute-api.us-east-1.amazonaws.com/prod/
- User Pool ID: us-east-1_NrQYz939C
- User Pool Client ID: 6stanr132kv6tq9dhkbpfjpdp6

## Scope

Frontend Vanilla JS SPA only:
- `frontend/index.html` — HTML shell
- `frontend/js/` — JavaScript modules (router, auth, uploader, editor, list, api)
- `frontend/css/` — Styles
- Frontend E2E tests

## Requirements

Inherited from parent spec (Requirements 1, 2, 4, 6):
- Requirement 1: User Authentication (Cognito SRP)
- Requirement 2: Receipt Image Upload
- Requirement 4: Expense Review and Editing
- Requirement 6: Expense List Display
- Requirement 11: Frontend E2E Testing

See `.kiro/specs/expense-submission-app/requirements.md` for full details.
