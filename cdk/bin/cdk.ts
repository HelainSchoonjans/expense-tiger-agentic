#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ExpenseAppStack } from '../lib/expense-app-stack';

const app = new cdk.App();
new ExpenseAppStack(app, 'ExpenseAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
