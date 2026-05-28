# Implementation Plan: Expense Backend

## Overview

Backend Lambda functions for the Expense Submission App. CDK infrastructure is already deployed. This spec implements the Python Lambda handlers, shared logging, and backend integration tests.

## Tasks

- [x] 1. Create shared logging module
  - Implement `JsonFormatter` class in `lambda/shared/logger.py` with structured JSON output
  - Include request_id, user_id, http_method, path, timestamp in log context
  - Configure log level from `LOG_LEVEL` environment variable
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 2. Implement extract handler (POST /expenses/extract)
  - Parse base64 image and content type from request body
  - Extract user_id from Cognito authorizer claims
  - Call Bedrock Claude with structured extraction prompt requesting JSON with merchant_name, date, total_amount, currency, tax_amount, payment_method, line_items, category
  - Parse Bedrock response as JSON, validate required fields (merchant_name, date, total_amount)
  - Log Bedrock invocation details (model_id, input_tokens, output_tokens, latency_ms)
  - Return extracted data or error response (422 EXTRACTION_FAILED, 503 SERVICE_UNAVAILABLE)
  - Log errors with full stack trace and request context
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2, 9.3, 9.5_

- [x] 3. Implement expenses CRUD handler (POST /expenses, GET /expenses)
  - POST: Validate expense data, generate UUID expense ID, set status="accepted", add createdAt/updatedAt timestamps, save to DynamoDB with userId partition key
  - GET: Query DynamoDB by userId, return expenses sorted by date descending
  - Extract user_id from Cognito authorizer claims for both operations
  - Return consistent error responses (400 INVALID_REQUEST, 500 INTERNAL_ERROR)
  - Log per-invocation context and errors with stack traces
  - _Requirements: 5.1, 5.2, 6.1, 6.3, 7.3, 9.2, 9.5_

- [x] 4. Checkpoint - Deploy and verify backend
  - Redeploy CDK stack with Lambda code: run `./scripts/deploy.sh`
  - Verify Lambda functions are updated with new code
  - Ask the user to run the deploy if needed

- [x] 5. Write backend integration test suite
  - Verify stack outputs (ApiEndpoint, UserPoolId, UserPoolClientId, WebsiteURL) are present and non-empty
  - Create and authenticate a Cognito test user programmatically
  - Verify CORS headers on OPTIONS requests to all endpoints
  - Verify 401 response for unauthenticated requests
  - Verify POST /expenses/extract with base64 test image returns valid JSON with extracted fields
  - Verify POST /expenses creates a record and GET /expenses retrieves it
  - Verify Lambda CloudWatch Log Groups exist and contain recent entries
  - If any test fails, retrieve CloudWatch logs via AWS CLI for diagnosis
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

## Notes

- This spec runs in parallel with the frontend spec (`expense-frontend`)
- Both specs share the same CDK infrastructure deployed in `expense-submission-app`
- After both specs complete, run `./scripts/deploy.sh` for a final full deploy
