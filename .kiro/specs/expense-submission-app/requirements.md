# Requirements Document

## Introduction

An expense submission application built as a serverless single-page application on AWS. Users authenticate via Cognito, upload receipt/expense images, send them to Amazon Bedrock for automated detail extraction, review and edit the extracted fields, accept the expense, and view a list of all submitted expenses. The application leverages the serverless-spa skill set (frontend, backend, bedrock, auth, deployment) for a Vanilla JS SPA served via CloudFront/S3, Python Lambda behind API Gateway, DynamoDB for persistence, and Amazon Bedrock for AI-powered receipt analysis.

## Glossary

- **Expense_App**: The serverless single-page application that handles expense submission and management
- **Auth_Module**: The Cognito-based authentication component handling sign-up, sign-in, sign-out, and session management
- **Receipt_Uploader**: The frontend component responsible for image file selection, validation, preview, and base64 encoding for upload
- **Extraction_Service**: The backend Lambda function that sends receipt images to Amazon Bedrock and parses the structured response
- **Expense_Store**: The DynamoDB table storing all expense records, scoped per user
- **Expense_Editor**: The frontend component that displays extracted receipt fields and allows the user to edit them before acceptance
- **Expense_List**: The frontend component that displays all accepted expenses for the authenticated user
- **User**: An authenticated person interacting with the Expense_App
- **Receipt_Image**: A photograph or scan of a receipt uploaded by the User
- **Expense_Record**: A structured data object containing merchant name, date, total amount, currency, line items, and category extracted from a Receipt_Image or manually entered by the User

## Requirements

### Requirement 1: User Authentication

**User Story:** As a User, I want to sign up and sign in to the Expense_App, so that my expenses are private and associated with my account.

#### Acceptance Criteria

1. WHEN the Expense_App loads, THE Auth_Module SHALL check for an existing valid Cognito session and display the main application if a session exists or the authentication gate if no session exists
2. WHEN a User submits the sign-up form with a valid email and password, THE Auth_Module SHALL create a new Cognito account and inform the User to verify the email address
3. WHEN a User submits the sign-in form with valid credentials for a verified account, THE Auth_Module SHALL authenticate the User using SRP protocol and display the main application
4. IF a User submits the sign-in form with invalid credentials, THEN THE Auth_Module SHALL display a descriptive error message without revealing whether the email exists
5. WHEN a User clicks the sign-out button, THE Auth_Module SHALL end the Cognito session and display the authentication gate
6. THE Auth_Module SHALL enforce a password policy requiring a minimum of 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one symbol

### Requirement 2: Receipt Image Upload

**User Story:** As a User, I want to upload a receipt image, so that the Expense_App can extract expense details automatically.

#### Acceptance Criteria

1. WHEN a User selects or drops an image file, THE Receipt_Uploader SHALL validate that the file is a supported image type (JPEG, PNG, or WebP) and does not exceed 5 MB
2. IF a User selects a file that is not a supported image type or exceeds 5 MB, THEN THE Receipt_Uploader SHALL display a specific error message indicating the validation failure reason
3. WHEN a valid image file is selected, THE Receipt_Uploader SHALL display a preview of the image to the User
4. WHEN a User confirms the upload, THE Receipt_Uploader SHALL encode the image as base64 and send it to the backend API endpoint with the Cognito JWT authorization header
5. WHILE the image is being uploaded and processed, THE Receipt_Uploader SHALL display a loading indicator to the User

### Requirement 3: Receipt Detail Extraction via Bedrock

**User Story:** As a User, I want the Expense_App to automatically extract details from my receipt image, so that I do not have to manually enter all expense information.

#### Acceptance Criteria

1. WHEN the backend receives a receipt image, THE Extraction_Service SHALL send the image to Amazon Bedrock using the Claude model with a structured extraction prompt
2. THE Extraction_Service SHALL extract the following fields from the receipt image: merchant name, date, total amount, currency, tax amount, payment method, and a list of line items (each with description, quantity, and unit price)
3. WHEN Bedrock returns a response, THE Extraction_Service SHALL parse the response as JSON and validate that required fields (merchant name, date, total amount) are present
4. IF the Bedrock response cannot be parsed as valid JSON or the receipt image does not contain recognizable receipt content, THEN THE Extraction_Service SHALL return an error indicating that extraction failed
5. IF a Bedrock API call fails, THEN THE Extraction_Service SHALL return an error with the failure reason to the client

### Requirement 4: Expense Review and Editing

**User Story:** As a User, I want to review and edit the extracted receipt details, so that I can correct any extraction errors before accepting the expense.

#### Acceptance Criteria

1. WHEN the Extraction_Service returns extracted receipt details, THE Expense_Editor SHALL display all extracted fields in editable form inputs
2. THE Expense_Editor SHALL display each line item with editable description, quantity, and unit price fields
3. WHEN a User modifies any field value, THE Expense_Editor SHALL update the displayed total amount if line item prices or quantities change
4. WHEN a User clicks the accept button, THE Expense_Editor SHALL validate that merchant name, date, and total amount are non-empty before submission
5. IF a User clicks the accept button with missing required fields, THEN THE Expense_Editor SHALL highlight the missing fields and display a validation error message


### Requirement 5: Expense Persistence

**User Story:** As a User, I want my accepted expenses to be saved, so that I can access them later.

#### Acceptance Criteria

1. WHEN a User accepts an expense, THE Expense_Store SHALL save the Expense_Record to DynamoDB with the User's Cognito sub as the partition key scope
2. THE Expense_Store SHALL store the following attributes for each Expense_Record: unique expense ID, user ID, merchant name, date, total amount, currency, tax amount, payment method, line items, category, status, and timestamps for creation and last update
3. WHEN the save operation completes, THE Expense_App SHALL display a success confirmation and navigate the User to the Expense_List
4. IF the save operation fails, THEN THE Expense_App SHALL display an error message and retain the expense data in the Expense_Editor so the User can retry

### Requirement 6: Expense List Display

**User Story:** As a User, I want to view a list of all my submitted expenses, so that I can track my spending.

#### Acceptance Criteria

1. WHEN a User navigates to the expense list view, THE Expense_List SHALL retrieve all Expense_Records for the authenticated User from the Expense_Store
2. THE Expense_List SHALL display each expense with merchant name, date, total amount, and currency in a card or row layout
3. THE Expense_List SHALL order expenses by date with the most recent expense displayed first
4. WHILE the expense list is loading, THE Expense_List SHALL display a loading indicator
5. IF the User has no submitted expenses, THEN THE Expense_List SHALL display an empty state message indicating no expenses have been submitted

### Requirement 7: API Security and Authorization

**User Story:** As a User, I want my expense data to be protected, so that only I can access my own expenses.

#### Acceptance Criteria

1. THE Expense_App SHALL require a valid Cognito JWT ID token in the Authorization header for all API requests
2. WHEN an API request is received without a valid authorization token, THE Expense_App SHALL return a 401 status code with an UNAUTHORIZED error code
3. THE Expense_Store SHALL scope all data queries using the authenticated User's Cognito sub claim, preventing access to other users' Expense_Records
4. THE Expense_App SHALL include CORS headers in all API responses allowing requests from the CloudFront distribution origin

### Requirement 8: Infrastructure and Deployment

**User Story:** As a developer, I want the application infrastructure defined as code, so that the application can be deployed and torn down reliably.

#### Acceptance Criteria

1. THE Expense_App SHALL define all AWS infrastructure (Cognito User Pool, API Gateway, Lambda functions, DynamoDB table, S3 bucket, CloudFront distribution) in a single CDK stack using TypeScript
2. THE Expense_App SHALL use deployment scripts to automate full-stack deployment, frontend-only updates, and cache invalidation
3. THE Expense_App SHALL generate the frontend configuration file (config.js) from CloudFormation stack outputs during deployment
4. THE Expense_App SHALL serve the frontend via CloudFront with Origin Access Control and block all direct public access to the S3 bucket

### Requirement 9: Backend Observability and Logging

**User Story:** As a developer, I want structured logging, tracing, and CloudWatch log configuration on all backend services, so that I can diagnose issues autonomously without manual AWS Console access.

#### Acceptance Criteria

1. ALL Lambda functions SHALL use Python structured logging (JSON format) with log level configurable via the `LOG_LEVEL` environment variable (default: INFO)
2. ALL Lambda functions SHALL log the following context on every invocation: request ID, user ID (from Cognito claims), HTTP method, path, and timestamp
3. ALL Lambda functions SHALL log Bedrock invocation details including model ID, input token count, output token count, and latency in milliseconds
4. THE CDK stack SHALL create explicit CloudWatch Log Groups for each Lambda function with a retention period of 14 days and RemovalPolicy.DESTROY
5. ALL Lambda functions SHALL log errors with full stack traces, request context, and the error response returned to the client

### Requirement 10: Backend Integration Testing and Deployment Verification

**User Story:** As a developer, I want automated verification of deployed backend services, so that the backend agent can self-diagnose and fix issues without human intervention.

#### Acceptance Criteria

1. AFTER a CDK deployment completes, THE deployment verification SHALL confirm that all CloudFormation stack outputs (ApiEndpoint, UserPoolId, UserPoolClientId, WebsiteURL) are present and non-empty
2. THE backend integration tests SHALL verify that the Cognito User Pool is accessible and can create/authenticate a test user programmatically
3. THE backend integration tests SHALL verify that API Gateway returns proper CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods) on OPTIONS requests to all endpoints
4. THE backend integration tests SHALL verify that API Gateway returns 401 for requests without a valid JWT token
5. THE backend integration tests SHALL verify that the Bedrock extraction endpoint accepts a base64-encoded test image and returns a valid JSON response with extracted fields
6. THE backend integration tests SHALL verify that the expenses CRUD endpoint can create and retrieve an expense record for an authenticated test user
7. IF any integration test fails, THE backend agent SHALL retrieve the relevant CloudWatch logs using the AWS CLI or API to diagnose the root cause before attempting a fix
8. THE backend integration tests SHALL verify that Lambda CloudWatch Log Groups exist and contain recent log entries after invocation

### Requirement 11: Frontend E2E Testing

**User Story:** As a developer, I want automated browser-based testing of the frontend, so that the frontend agent can verify UI behavior without human intervention.

#### Acceptance Criteria

1. THE frontend E2E tests SHALL use Playwright or Chrome DevTools to verify that the authentication gate renders when no session exists
2. THE frontend E2E tests SHALL verify that a user can complete the sign-up, email verification, and sign-in flow
3. THE frontend E2E tests SHALL verify that the receipt upload component accepts a valid image file and displays a preview
4. THE frontend E2E tests SHALL verify that after upload and extraction, the expense editor displays editable fields populated with extracted data
5. THE frontend E2E tests SHALL verify that the accept button saves the expense and navigates to the expense list view
6. THE frontend E2E tests SHALL verify that the expense list displays previously accepted expenses with correct merchant name, date, and amount
7. THE frontend E2E tests SHALL verify that form validation prevents submission when required fields are empty
