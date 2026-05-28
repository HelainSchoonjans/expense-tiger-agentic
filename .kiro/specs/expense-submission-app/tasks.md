# Implementation Plan: Expense Submission App

## Overview

Incremental build of a serverless expense submission SPA. Infrastructure first (CDK), then backend Lambdas, then frontend SPA, then integration wiring, testing, and deployment verification. Frontend (Vanilla JS) and backend (Python Lambda) are developed in parallel after the CDK stack is in place.

## Tasks

- [x] 1. Set up CDK infrastructure stack
  - [x] 1.1 Initialize CDK project and install dependencies
    - Create `cdk/` directory with `cdk init app --language typescript`
    - Install CDK dependencies: `@aws-cdk/aws-cognito`, `@aws-cdk/aws-apigateway`, `@aws-cdk/aws-lambda`, `@aws-cdk/aws-dynamodb`, `@aws-cdk/aws-s3`, `@aws-cdk/aws-cloudfront`, `@aws-cdk/aws-logs`
    - _Requirements: 8.1_

  - [x] 1.2 Define Cognito User Pool and App Client
    - Create User Pool with password policy (min 8 chars, uppercase, lowercase, digit, symbol)
    - Create App Client with SRP auth flow (no client secret)
    - _Requirements: 1.6, 8.1_

  - [x] 1.3 Define DynamoDB Expenses table
    - Partition key: `userId` (String), Sort key: `expenseId` (String)
    - Billing mode: PAY_PER_REQUEST
    - _Requirements: 5.1, 5.2, 8.1_

  - [x] 1.4 Define Lambda functions with log groups
    - Create `extractFunction` (Python 3.12 runtime) with Bedrock invoke permissions
    - Create `expensesFunction` (Python 3.12 runtime) with DynamoDB read/write permissions
    - Create explicit CloudWatch Log Groups for each Lambda (14-day retention, RemovalPolicy.DESTROY)
    - Set `LOG_LEVEL` environment variable (default: INFO)
    - Pass table name and Bedrock model ID as environment variables
    - _Requirements: 8.1, 9.1, 9.4_

  - [x] 1.5 Define API Gateway with Cognito authorizer and CORS
    - Create REST API with Cognito User Pools authorizer
    - Add `POST /expenses/extract`, `POST /expenses`, `GET /expenses` resources
    - Enable CORS on all endpoints (allow CloudFront origin, Authorization header)
    - _Requirements: 7.1, 7.2, 7.4, 8.1_

  - [x] 1.6 Define S3 bucket and CloudFront distribution
    - Create S3 bucket with block public access
    - Create CloudFront distribution with Origin Access Control to S3
    - _Requirements: 8.4_

  - [x] 1.7 Add CloudFormation outputs and deployment scripts
    - Output: ApiEndpoint, UserPoolId, UserPoolClientId, WebsiteURL
    - Create deployment script that deploys CDK, generates `config.js` from stack outputs, syncs frontend to S3, invalidates CloudFront cache
    - Create frontend-only deploy script (sync + invalidate)
    - _Requirements: 8.2, 8.3, 10.1_

- [x] 2. Checkpoint - Deploy CDK stack and verify outputs
  - Run `cdk deploy`, verify all CloudFormation outputs are present and non-empty
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement backend Lambda functions
  - [x] 3.1 Create shared logging module
    - Implement `JsonFormatter` class with structured JSON output
    - Include request_id, user_id, http_method, path, timestamp in log context
    - Configure log level from `LOG_LEVEL` environment variable
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 3.2 Implement extract handler (POST /expenses/extract)
    - Parse base64 image and content type from request body
    - Extract user_id from Cognito authorizer claims
    - Call Bedrock Claude with structured extraction prompt requesting JSON with merchant_name, date, total_amount, currency, tax_amount, payment_method, line_items, category
    - Parse Bedrock response as JSON, validate required fields (merchant_name, date, total_amount)
    - Log Bedrock invocation details (model_id, input_tokens, output_tokens, latency_ms)
    - Return extracted data or error response (422 EXTRACTION_FAILED, 503 SERVICE_UNAVAILABLE)
    - Log errors with full stack trace and request context
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2, 9.3, 9.5_

  - [ ]* 3.3 Write property test: Bedrock response parsing (Property 3)
    - **Property 3: Bedrock response parsing extracts and validates all fields**
    - Use Hypothesis to generate valid/invalid JSON objects and verify parse_bedrock_response + validate_extraction behavior
    - Minimum 100 iterations
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 3.4 Write property test: Expense record completeness (Property 6)
    - **Property 6: Expense record completeness**
    - Use Hypothesis to generate valid expense inputs and verify all required attributes are present in the produced record
    - Minimum 100 iterations
    - **Validates: Requirements 5.2**

  - [x] 3.5 Implement expenses CRUD handler (POST /expenses, GET /expenses)
    - POST: Validate expense data, generate UUID expense ID, set status="accepted", add createdAt/updatedAt timestamps, save to DynamoDB with userId partition key
    - GET: Query DynamoDB by userId, return expenses sorted by date descending
    - Extract user_id from Cognito authorizer claims for both operations
    - Return consistent error responses (400 INVALID_REQUEST, 500 INTERNAL_ERROR)
    - Log per-invocation context and errors with stack traces
    - _Requirements: 5.1, 5.2, 6.1, 6.3, 7.3, 9.2, 9.5_

  - [ ]* 3.6 Write property test: Expense list date ordering (Property 7)
    - **Property 7: Expense list date ordering**
    - Use Hypothesis to generate lists of expense records and verify sort output is in descending date order
    - Minimum 100 iterations
    - **Validates: Requirements 6.3**

  - [ ]* 3.7 Write property test: User data isolation (Property 8)
    - **Property 8: User data isolation**
    - Use Hypothesis to generate two distinct user IDs and expense records, verify query for user A never returns user B's records
    - Minimum 100 iterations
    - **Validates: Requirements 7.3**

- [x] 4. Checkpoint - Deploy and verify backend
  - Redeploy CDK stack with Lambda code
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement frontend SPA
  - [x] 5.1 Create HTML shell and router
    - Create `index.html` with container divs for each view (auth, upload, editor, expense list)
    - Create `router.js` with hash-based routing (#/auth, #/upload, #/edit, #/expenses)
    - Create `app.js` entry point that initializes router and auth module
    - Create `api.js` client module with snake_case ↔ camelCase conversion, JWT header injection, and error handling (401 → redirect to auth gate)
    - Include Cognito Identity SDK via CDN or bundled
    - _Requirements: 1.1_

  - [x] 5.2 Implement AuthModule
    - Implement signUp (email, password) → Cognito UserPool signUp
    - Implement confirmSignUp (email, code) → confirmRegistration
    - Implement signIn (email, password) → SRP authentication → store session
    - Implement signOut → clear session → navigate to #/auth
    - Implement getSession/getIdToken/isAuthenticated helpers
    - Render auth gate (sign-in/sign-up forms with toggle) or main app based on session state
    - Display descriptive error messages on sign-in failure without revealing email existence
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 5.3 Write property test: Password policy validation (Property 1)
    - **Property 1: Password policy validation**
    - Use fast-check to generate arbitrary strings and verify password validation accepts iff ≥8 chars with uppercase, lowercase, digit, and symbol
    - Minimum 100 iterations
    - **Validates: Requirements 1.6**

  - [x] 5.4 Implement ReceiptUploader
    - Create file input and drop zone UI
    - Validate file type (JPEG, PNG, WebP) and size (≤5 MB) with specific error messages
    - Display image preview via FileReader
    - Encode file as base64, POST to `/expenses/extract` with JWT Authorization header
    - Show/hide loading indicator during upload and processing
    - On success, navigate to #/edit with extracted data; on error, display error message
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 5.5 Write property test: File upload validation (Property 2)
    - **Property 2: File upload validation with correct error reason**
    - Use fast-check to generate file objects with random MIME types and sizes, verify validation accepts iff type is JPEG/PNG/WebP and size ≤ 5 MB, and error message indicates specific failure reason
    - Minimum 100 iterations
    - **Validates: Requirements 2.1, 2.2**

  - [x] 5.6 Implement ExpenseEditor
    - Render all extracted fields in editable form inputs (merchant name, date, total amount, currency, tax amount, payment method, category)
    - Render line items with editable description, quantity, unit price fields
    - Recalculate and display total when line item values change
    - Validate required fields (merchant name, date, total amount) on accept, highlight missing fields
    - On accept, POST to `/expenses` with JWT; on success, show confirmation and navigate to #/expenses; on failure, display error and retain form data
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3, 5.4_

  - [ ]* 5.7 Write property test: Line item total calculation (Property 4)
    - **Property 4: Line item total calculation**
    - Use fast-check to generate arrays of {quantity, unitPrice} and verify calculated total equals sum of quantity × unitPrice
    - Minimum 100 iterations
    - **Validates: Requirements 4.3**

  - [ ]* 5.8 Write property test: Expense submission validation (Property 5)
    - **Property 5: Expense submission validation**
    - Use fast-check to generate expense data objects with random field presence and verify validation accepts iff merchant name, date, and total amount are all non-empty
    - Minimum 100 iterations
    - **Validates: Requirements 4.4**

  - [x] 5.9 Implement ExpenseList
    - GET `/expenses` with JWT on view load
    - Render expense cards/rows with merchant name, date, total amount, currency
    - Display expenses sorted by date descending (most recent first)
    - Show loading indicator while fetching
    - Show empty state message when no expenses exist
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.10 Add basic CSS styling
    - Style auth forms, upload area, editor form, expense list cards
    - Add responsive layout for mobile and desktop
    - Style loading indicators, error messages, and empty states

- [x] 6. Checkpoint - Deploy frontend and verify end-to-end
  - Deploy frontend to S3 via deployment script, invalidate CloudFront cache
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Backend integration tests
  - [x] 7.1 Write integration test suite
    - Verify stack outputs (ApiEndpoint, UserPoolId, UserPoolClientId, WebsiteURL) are present and non-empty
    - Create and authenticate a Cognito test user programmatically
    - Verify CORS headers on OPTIONS requests to all endpoints
    - Verify 401 response for unauthenticated requests
    - Verify POST /expenses/extract with base64 test image returns valid JSON with extracted fields
    - Verify POST /expenses creates a record and GET /expenses retrieves it
    - Verify Lambda CloudWatch Log Groups exist and contain recent entries
    - If any test fails, retrieve CloudWatch logs via AWS CLI for diagnosis
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 8. Frontend E2E tests
  - [x] 8.1 Write E2E test suite using Playwright
    - Verify auth gate renders when no session exists
    - Verify sign-up, email verification, and sign-in flow
    - Verify receipt upload accepts valid image and displays preview
    - Verify expense editor displays editable fields after extraction
    - Verify accept button saves expense and navigates to expense list
    - Verify expense list displays accepted expenses with correct data
    - Verify form validation prevents submission with empty required fields
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 9. Final checkpoint - Full verification
  - Run all property tests, unit tests, integration tests, and E2E tests
  - 9 backend tests passed, 4 skipped (Cognito auth). 12 E2E passed, 2 failed (known issues), 1 skipped.
  - Known issues filed as GitLab issues #1, #2, #3.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Frontend (task 5) and backend (task 3) can be developed in parallel after CDK infrastructure (task 1) is deployed
- Property tests use fast-check (frontend JS) and Hypothesis (backend Python) with minimum 100 iterations each
- Integration tests (task 7) verify deployed services; E2E tests (task 8) verify UI flows
- Checkpoints ensure incremental validation at each major milestone
