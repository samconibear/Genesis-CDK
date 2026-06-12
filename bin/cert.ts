#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertStack } from '../src/index.js';

const app = new cdk.App();

new CertStack(app, 'CertStack', {
  // CDK_DEFAULT_ACCOUNT is set automatically from AWS credentials
  accountId: process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012',
  // GITHUB_REPOSITORY is set automatically by GitHub Actions (format: owner/repo)
  githubRepo: process.env.GITHUB_REPOSITORY ?? 'my-org/my-repo',
  domain: process.env.DOMAIN ?? 'example.com',
});
