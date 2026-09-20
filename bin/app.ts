#!/usr/bin/env node
// Generic template — copy this to your app repo and edit domain/src.
// In this repo, cdk.json points at bin/sconi.ts (the real sconi.io deployment).
import * as cdk from 'aws-cdk-lib';
import { RootSite } from 'genesis-cdk';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'AppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new RootSite({
  scope: stack,
  domain: process.env.DOMAIN ?? 'example.com',
  src: './dist',
});
