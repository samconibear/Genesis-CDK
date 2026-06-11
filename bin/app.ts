#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RootSite } from '../src/index.js';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'AppStack', {
  env: { account: '123456789012', region: 'eu-west-2' },
});

const root = new RootSite({
  scope: stack,
  domain: 'example.com',
  src: './dist',
});

root.subSite({
  domain: 'app',
  src: './packages/app/dist',
});
