# Sample Review Output

This is an example of the expected code review format. The file under review is a fictional Lambda handler.

---

## Code Review: `get-user-handler.ts`

**File type:** Lambda Handler
**Reviewed:** 2026-03-27

### Critical Issues

**[CRITICAL-1]** `get-user-handler.ts:5` — Hardcoded database connection string
- **Issue:** The database URL including credentials is stored as a string literal: `const DB_URL = "postgres://admin:p4ssw0rd@prod-db.example.com:5432/users"`.
- **Why it matters:** Credentials committed to source control can be extracted from git history even after removal. This is a security vulnerability.
- **Suggested fix:** Store the connection string in AWS Secrets Manager and retrieve it at runtime:
  ```typescript
  import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
  const smClient = new SecretsManagerClient({});
  const secret = await smClient.send(new GetSecretValueCommand({ SecretId: 'prod/db-url' }));
  const dbUrl = secret.SecretString;
  ```

**[CRITICAL-2]** `get-user-handler.ts:22` — No error handling around database query
- **Issue:** The `db.query()` call on line 22 is not wrapped in a try/catch. A database timeout or connection failure will crash the Lambda with an unhandled promise rejection.
- **Why it matters:** Unhandled errors return a 502 to the caller with no useful error message and no log trail for debugging.
- **Suggested fix:** Wrap in try/catch and return a structured error response:
  ```typescript
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
  } catch (error) {
    logger.error('Database query failed', { error, userId });
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
  ```

### Warnings

**[WARNING-1]** `get-user-handler.ts:1` — Using AWS SDK v2
- **Issue:** The file imports `const AWS = require('aws-sdk')` which is the legacy monolithic SDK.
- **Why it matters:** SDK v2 is in maintenance mode, increases cold start time due to bundle size, and lacks modular tree-shaking.
- **Suggested fix:** Migrate to SDK v3 modular imports:
  ```typescript
  import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
  ```

**[WARNING-2]** `get-user-handler.ts:15` — No input validation on `event.pathParameters.userId`
- **Issue:** `userId` is read directly from path parameters without null checking or format validation.
- **Why it matters:** A missing or malformed `userId` will cause a downstream query error instead of a clean 400 response.
- **Suggested fix:**
  ```typescript
  const userId = event.pathParameters?.userId;
  if (!userId || !/^[a-f0-9-]{36}$/.test(userId)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing userId' }) };
  }
  ```

### Suggestions

**[SUGGESTION-1]** `get-user-handler.ts:10` — Add structured logging
- **Issue:** The handler uses `console.log('Processing request')` with a plain string.
- **Why it matters:** Plain string logs are harder to search and filter in CloudWatch Logs Insights compared to structured JSON.
- **Suggested fix:** Use a structured logger like `@aws-lambda-powertools/logger`:
  ```typescript
  import { Logger } from '@aws-lambda-powertools/logger';
  const logger = new Logger({ serviceName: 'user-api' });
  logger.info('Processing request', { userId, method: event.httpMethod });
  ```

**[SUGGESTION-2]** `get-user-handler.ts:8` — DynamoDB client instantiated inside handler
- **Issue:** `new DynamoDBClient({})` is called inside the handler function body.
- **Why it matters:** Moving client instantiation outside the handler allows connection reuse across warm invocations, reducing latency.
- **Suggested fix:** Move to module scope:
  ```typescript
  // Module scope — reused across invocations
  const client = new DynamoDBClient({});

  export const handler = async (event: APIGatewayProxyEvent) => {
    // use client here
  };
  ```

### Passed Checks

- ✅ File uses `.ts` extension with proper TypeScript types
- ✅ Handler function signature matches `APIGatewayProxyEvent` / `APIGatewayProxyResult`
- ✅ No wildcard IAM permissions in associated CDK stack
- ✅ Naming conventions followed — `camelCase` variables, `PascalCase` types
- ✅ Response bodies are JSON-serialized consistently
