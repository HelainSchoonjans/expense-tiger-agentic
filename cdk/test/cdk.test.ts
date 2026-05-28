import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ExpenseAppStack } from '../lib/expense-app-stack';

describe('ExpenseAppStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new ExpenseAppStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('creates Cognito User Pool with correct password policy', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
      AutoVerifiedAttributes: ['email'],
    });
  });

  test('creates Cognito User Pool with self sign-up enabled', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: false,
      },
    });
  });

  test('creates Cognito User Pool with email sign-in', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
    });
  });

  test('creates App Client with SRP auth and no secret', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ExplicitAuthFlows: Match.arrayWith([
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ]),
      GenerateSecret: false,
    });
  });

  test('creates DynamoDB Expenses table with correct key schema', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'expenseId', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'expenseId', AttributeType: 'S' },
      ],
    });
  });

  test('creates DynamoDB Expenses table with PAY_PER_REQUEST billing', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  test('creates DynamoDB Expenses table with DESTROY removal policy', () => {
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  test('creates extract Lambda function with Python 3.12 runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.12',
      Handler: 'handler.handler',
      Environment: {
        Variables: Match.objectLike({
          LOG_LEVEL: 'INFO',
          BEDROCK_MODEL_ID: Match.anyValue(),
          TABLE_NAME: Match.anyValue(),
        }),
      },
    });
  });

  test('creates expenses Lambda function with Python 3.12 runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.12',
      Handler: 'handler.handler',
      Environment: {
        Variables: Match.objectLike({
          LOG_LEVEL: 'INFO',
          TABLE_NAME: Match.anyValue(),
        }),
      },
    });
  });

  test('grants extract Lambda Bedrock invoke permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'bedrock:InvokeModel',
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  test('grants expenses Lambda DynamoDB read/write permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:DeleteItem',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  test('creates CloudWatch Log Groups with 14-day retention', () => {
    const logGroups = template.findResources('AWS::Logs::LogGroup', {
      Properties: {
        RetentionInDays: 14,
      },
    });
    expect(Object.keys(logGroups).length).toBeGreaterThanOrEqual(2);
  });

  test('creates CloudWatch Log Groups with DESTROY removal policy', () => {
    const logGroups = template.findResources('AWS::Logs::LogGroup', {
      DeletionPolicy: 'Delete',
    });
    expect(Object.keys(logGroups).length).toBeGreaterThanOrEqual(2);
  });

  test('exposes Lambda functions as public readonly properties', () => {
    const app = new cdk.App();
    const stack = new ExpenseAppStack(app, 'PropertyTestStack');
    expect(stack.extractFunction).toBeDefined();
    expect(stack.expensesFunction).toBeDefined();
    expect(stack.extractLogGroup).toBeDefined();
    expect(stack.expensesLogGroup).toBeDefined();
  });

  // API Gateway tests (Task 1.5)
  test('creates REST API Gateway', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'ExpenseApi',
    });
  });

  test('creates Cognito User Pools authorizer', () => {
    template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
      Type: 'COGNITO_USER_POOLS',
    });
  });

  test('creates POST /expenses method with Cognito auth', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      AuthorizationType: 'COGNITO_USER_POOLS',
    });
  });

  test('creates GET /expenses method with Cognito auth', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'GET',
      AuthorizationType: 'COGNITO_USER_POOLS',
    });
  });

  test('creates CORS OPTIONS methods on resources', () => {
    const methods = template.findResources('AWS::ApiGateway::Method', {
      Properties: {
        HttpMethod: 'OPTIONS',
        AuthorizationType: 'NONE',
      },
    });
    // /expenses and /expenses/extract should both have OPTIONS
    expect(Object.keys(methods).length).toBeGreaterThanOrEqual(2);
  });

  test('exposes API as public readonly property', () => {
    const app = new cdk.App();
    const stack = new ExpenseAppStack(app, 'ApiPropertyTestStack');
    expect(stack.api).toBeDefined();
  });

  // S3 and CloudFront tests (Task 1.6)
  test('creates S3 bucket with block public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates S3 bucket with DESTROY removal policy', () => {
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  test('creates CloudFront distribution with default root object', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
      }),
    });
  });

  test('creates CloudFront distribution with error responses for SPA routing', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
          Match.objectLike({
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
        ]),
      }),
    });
  });

  test('creates CloudFront Origin Access Control for S3', () => {
    template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: Match.objectLike({
        OriginAccessControlOriginType: 's3',
        SigningBehavior: 'always',
        SigningProtocol: 'sigv4',
      }),
    });
  });

  test('creates CloudFront distribution with HTTPS redirect', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
        }),
      }),
    });
  });

  test('exposes siteBucket and distribution as public readonly properties', () => {
    const app = new cdk.App();
    const stack = new ExpenseAppStack(app, 'S3CFPropertyTestStack');
    expect(stack.siteBucket).toBeDefined();
    expect(stack.distribution).toBeDefined();
  });

  // CloudFormation outputs tests (Task 1.7)
  test('outputs ApiEndpoint', () => {
    template.hasOutput('ApiEndpoint', {
      Value: Match.anyValue(),
    });
  });

  test('outputs UserPoolId', () => {
    template.hasOutput('UserPoolId', {
      Value: Match.anyValue(),
    });
  });

  test('outputs UserPoolClientId', () => {
    template.hasOutput('UserPoolClientId', {
      Value: Match.anyValue(),
    });
  });

  test('outputs WebsiteURL', () => {
    template.hasOutput('WebsiteURL', {
      Value: Match.anyValue(),
    });
  });

  test('outputs SiteBucketName', () => {
    template.hasOutput('SiteBucketName', {
      Value: Match.anyValue(),
    });
  });

  test('outputs DistributionId', () => {
    template.hasOutput('DistributionId', {
      Value: Match.anyValue(),
    });
  });
});
