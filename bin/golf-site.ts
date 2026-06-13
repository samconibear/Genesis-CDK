#!/usr/bin/env node
/**
 * Example: deploy the golf score differential calculator using genesis-cdk.
 *
 * Prerequisites:
 *   1. Run CertStack once for your domain (see bin/cert.ts).
 *   2. Set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION env vars, or fill them in below.
 *
 * Deploy:
 *   npx cdk --app "npx ts-node --prefer-ts-exts bin/golf-site.ts" deploy GolfSiteStack
 */

import * as cdk from 'aws-cdk-lib';
import { RootSite } from '../src/index.js';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'GolfSiteStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
});

new RootSite({
  scope: stack,
  domain: process.env.DOMAIN ?? 'golf.example.com',
  src: './website',
});
