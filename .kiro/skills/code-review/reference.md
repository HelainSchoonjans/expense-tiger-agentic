# Code Review Reference

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Variables & functions | `camelCase` | `getUserName`, `isActive` |
| Classes & interfaces | `PascalCase` | `UserService`, `ApiResponse` |
| React components | `PascalCase` | `UserProfile`, `NavBar` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `API_BASE_URL` |
| File names (general) | `kebab-case` | `user-service.ts`, `api-client.ts` |
| File names (React) | `PascalCase` | `UserProfile.tsx`, `NavBar.tsx` |
| CDK construct IDs | `PascalCase` | `ApiGateway`, `UserTable` |
| Environment variables | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `LOG_LEVEL` |
| Type parameters | Single uppercase letter or `PascalCase` | `T`, `TResult` |
| Enums | `PascalCase` (members too) | `Status.Active`, `Role.Admin` |
| Boolean variables | Prefixed with `is`, `has`, `should`, `can` | `isLoading`, `hasPermission` |

## Error Handling Patterns

### Lambda Handlers

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'my-service' });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Received event', { path: event.path, method: event.httpMethod });

  try {
    // Validate input early
    const body = JSON.parse(event.body ?? '{}');
    if (!body.requiredField) {
      return { statusCode: 400, body: JSON.stringify({ error: 'requiredField is missing' }) };
    }

    // Business logic
    const result = await processRequest(body);

    logger.info('Request processed', { resultId: result.id });
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    logger.error('Handler failed', { error });
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
```

Key rules:
- Wrap the entire handler body in `try/catch`.
- Log at entry and exit (success and failure).
- Validate input before processing.
- Never expose internal error details in the response body.
- Return appropriate HTTP status codes.

### React Components

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

Key rules:
- Wrap data-fetching components in an error boundary.
- Provide a meaningful fallback UI.
- Log caught errors for observability.

### Async Operations (General)

```typescript
// Prefer: explicit error types and recovery
try {
  const data = await fetchData();
  return processData(data);
} catch (error) {
  if (error instanceof NetworkError) {
    return getCachedData(); // graceful degradation
  }
  throw error; // re-throw unexpected errors
}
```

Key rules:
- Catch specific error types when possible.
- Provide fallback behavior for recoverable errors.
- Re-throw unexpected errors so they surface.

## AWS SDK v3 Patterns

```typescript
// Client outside handler for connection reuse
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SomeEvent) => {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk: event.id },
  }));
  return result.Item;
};
```

Key rules:
- Use modular `@aws-sdk/client-*` imports, never `aws-sdk` v2.
- Instantiate clients outside the handler.
- Use environment variables for resource names, never hardcode ARNs.

## CDK Best Practices

```typescript
// Stateful resources need explicit removal policies
const table = new dynamodb.Table(this, 'UserTable', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  removalPolicy: cdk.RemovalPolicy.RETAIN, // explicit
});

// Least-privilege IAM
table.grantReadData(lambdaFunction); // scoped grant, not wildcard
```

Key rules:
- Always set `removalPolicy` on stateful resources.
- Use grant methods (`grantReadData`, `grantWriteData`) instead of manual policy statements.
- When manual policies are needed, scope actions and resources explicitly.

## Secrets Management

Never hardcode:
- API keys or tokens
- Database credentials
- AWS access keys
- Encryption keys
- Connection strings with credentials

Use instead:
- AWS Secrets Manager for runtime secrets
- SSM Parameter Store for configuration
- Environment variables (injected at deploy time, not committed)
