#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertStack } from '../src/index.js';

const app = new cdk.App();

new CertStack(app, 'CertStack', {
  domain: 'example.com',
  accountId: '123456789012',
  githubRepo: 'my-org/my-repo',
});
