import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';
import { Construct } from 'constructs';

export class ExpenseAppStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly expensesTable: dynamodb.Table;
  public readonly extractFunction: lambda.Function;
  public readonly expensesFunction: lambda.Function;
  public readonly extractLogGroup: logs.LogGroup;
  public readonly expensesLogGroup: logs.LogGroup;
  public readonly api: apigateway.RestApi;
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool (Task 1.2)
    this.userPool = new cognito.UserPool(this, 'ExpenseUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito App Client with SRP auth flow, no client secret (Task 1.2)
    this.userPoolClient = this.userPool.addClient('ExpenseAppClient', {
      authFlows: {
        userSrp: true,
      },
      generateSecret: false,
    });

    // DynamoDB Expenses table (Task 1.3)
    this.expensesTable = new dynamodb.Table(this, 'ExpensesTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'expenseId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda functions with log groups (Task 1.4)
    const bedrockModelId = 'anthropic.claude-sonnet-4-6';

    this.extractFunction = new lambda.Function(this, 'ExtractFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/extract')),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        LOG_LEVEL: 'INFO',
        TABLE_NAME: this.expensesTable.tableName,
        BEDROCK_MODEL_ID: bedrockModelId,
      },
    });

    this.extractFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          'arn:aws:bedrock:*:*:foundation-model/*',
          'arn:aws:bedrock:*:*:inference-profile/*',
        ],
      }),
    );

    this.extractLogGroup = new logs.LogGroup(this, 'ExtractFnLogs', {
      logGroupName: `/aws/lambda/${this.extractFunction.functionName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.expensesFunction = new lambda.Function(this, 'ExpensesFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/expenses')),
      environment: {
        LOG_LEVEL: 'INFO',
        TABLE_NAME: this.expensesTable.tableName,
      },
    });

    this.expensesTable.grantReadWriteData(this.expensesFunction);

    this.expensesLogGroup = new logs.LogGroup(this, 'ExpensesFnLogs', {
      logGroupName: `/aws/lambda/${this.expensesFunction.functionName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // API Gateway with Cognito authorizer (Task 1.5)
    this.api = new apigateway.RestApi(this, 'ExpenseApi', {
      restApiName: 'ExpenseApi',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
      },
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [this.userPool],
    });

    const expensesResource = this.api.root.addResource('expenses');

    // POST /expenses - create expense
    expensesResource.addMethod('POST', new apigateway.LambdaIntegration(this.expensesFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /expenses - list expenses
    expensesResource.addMethod('GET', new apigateway.LambdaIntegration(this.expensesFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /expenses/extract - extract receipt data
    const extractResource = expensesResource.addResource('extract');
    extractResource.addMethod('POST', new apigateway.LambdaIntegration(this.extractFunction, {
      timeout: cdk.Duration.seconds(29),
    }), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // S3 bucket and CloudFront distribution (Task 1.6)
    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront access logs bucket
    const cfLogsBucket = new s3.Bucket(this, 'CloudFrontLogsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
    });

    this.distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      enableLogging: true,
      logBucket: cfLogsBucket,
      logFilePrefix: 'cf-logs/',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // CloudFormation outputs (Task 1.7)
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'SiteBucketName', {
      value: this.siteBucket.bucketName,
      description: 'S3 bucket name for frontend assets',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontLogsBucketName', {
      value: cfLogsBucket.bucketName,
      description: 'S3 bucket for CloudFront access logs',
    });
  }
}
