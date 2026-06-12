#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RootSite } from '../src/index.js';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'AppStack', {
  // CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION are set automatically from AWS credentials
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

const root = new RootSite({
  scope: stack,
  domain: process.env.DOMAIN ?? 'example.com',
  src: './dist',
});

root.subSite({
  domain: 'app',
  src: './packages/app/dist',
});
