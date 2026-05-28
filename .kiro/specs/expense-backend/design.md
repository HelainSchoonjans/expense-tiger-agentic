# Design: Expense Backend (Lambda Functions)

## Context

See `.kiro/specs/expense-submission-app/design.md` for full architecture. This spec covers only the backend Lambda implementation.

## Backend Components

### Shared Logging (`lambda/shared/logger.py`)
- JsonFormatter with structured JSON output
- Per-invocation context: request_id, user_id, http_method, path, timestamp
- LOG_LEVEL from environment variable

### Extract Handler (`lambda/extract/handler.py`)
- POST /expenses/extract
- Parses base64 image from request body
- Calls Bedrock Claude with structured extraction prompt
- Parses JSON response, validates required fields
- Returns extracted data or error (422/503)

### Expenses CRUD Handler (`lambda/expenses/handler.py`)
- POST /expenses — validate, generate UUID, save to DynamoDB
- GET /expenses — query by userId, sort by date descending

### Data Model (DynamoDB)
- PK: userId (Cognito sub), SK: expenseId (UUID)
- Attributes: merchantName, date, totalAmount, currency, taxAmount, paymentMethod, lineItems, category, status, createdAt, updatedAt

### Error Response Format
```json
{ "error": { "code": "ERROR_CODE", "message": "description" } }
```

## Correctness Properties (Backend)
- Property 3: Bedrock response parsing
- Property 6: Expense record completeness
- Property 7: Expense list date ordering
- Property 8: User data isolation
