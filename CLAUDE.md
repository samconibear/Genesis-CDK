# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Genesis-CDK is an AWS CDK framework that deploys static websites (S3 + CloudFront) with custom domains, TLS certificates, and Route 53 DNS — abstracting all infrastructure details from the developer. The current deployment targets `sconi.io` and its subdomains.

## Repository Structure

```
src/
  config.ts              # Shared config: domain, AWS account ID, region
  main.sh                # Orchestrates full deploy: cert-stack then app-stack
  bin/
    init.sh              # Deploys only CertStack (one-time setup)
    deploy.sh            # (empty — see main.sh)
  assets/
    cert-outputs.json    # CDK outputs from CertStack (certArn, hostedZoneId)
  cert-stack/            # Standalone CDK app — deploys to us-east-1
  app-stack/             # Standalone CDK app — deploys to eu-west-2
```

Each of `cert-stack` and `app-stack` is an independent CDK app with its own `package.json`, `tsconfig.json`, and `cdk.json`. Commands must be run from within each subdirectory.

## Two-Stack Architecture

**Why two stacks?** CloudFront certificates must live in `us-east-1` (AWS requirement), but the app can deploy to any region. The two stacks are decoupled: `cert-stack` runs first and outputs `certArn` and `hostedZoneId`, which `app-stack` reads from `../assets/cert-outputs.json`.

### cert-stack (`src/cert-stack/`, deploys to us-east-1)
Creates:
- Route 53 Hosted Zone for the root domain
- ACM wildcard certificate (`*.sconi.io`) validated via DNS

Outputs `certArn`, `hostedZoneId`, `rootDomain` to `src/assets/cert-outputs.json`.

### app-stack (`src/app-stack/`, deploys to eu-west-2)
Key constructs:
- **`RootSite`** — extends `BaseSite` for the apex domain (`sconi.io`). Hardcodes the hosted zone ID and cert ARN read from prior cert-stack output.
- **`BaseSite`** — core construct: creates an S3 bucket (TLS-enforced policy), deploys static assets via `BucketDeployment`, creates a CloudFront distribution (HTTPS redirect, SNI, `PRICE_CLASS_100`), and adds a Route 53 A-record alias.
- **`SubSite`** — thin wrapper: calls `BaseSite.subSite()` to create a subdomain site (e.g., `bordle.sconi.io`) sharing the same hosted zone and certificate.
- **`Backend`** — optional: creates an API Gateway (regional, TLS 1.2, custom domain `api-<subdomain>.sconi.io`) and wires it into CloudFront under `/api/*`.

`SconiStack` in `lib/sconi-stack.ts` is the composition root: it instantiates `RootSite` and calls `.subSite()` for each subdomain.

## Commands

All CDK commands must be run from within the relevant subdirectory.

### First-time setup (one-time)
```bash
cd src/cert-stack && npm install
cd src/app-stack && npm install
```

### Deploy cert-stack (one-time, or when domain/cert changes)
```bash
cd src/cert-stack
npx cdk deploy CertStack --outputs-file "../assets/cert-outputs.json"
```

### Deploy app-stack
```bash
cd src/app-stack
npx cdk deploy SconiStack
```

### Full deploy (both stacks in sequence)
```bash
cd src && bash main.sh
```

### Build / synth / diff
```bash
# From within cert-stack or app-stack:
npm run build          # tsc compile
npx cdk synth          # emit CloudFormation template
npx cdk diff           # compare deployed vs local
```

### Tests
```bash
# From within cert-stack or app-stack:
npm test               # run jest
npm test -- --testPathPattern=<filename>  # run a single test file
```

## Adding a New Subdomain

In `src/app-stack/lib/sconi-stack.ts`, add a `rootSite.subSite()` call:
```ts
rootSite.subSite({
  domain: 'myapp',          // creates myapp.sconi.io
  src: '../../myapp/www/dist',
});
```

The static build output for each site is expected at the `src` path relative to `app-stack/`.

## Key Design Notes

- `RootSite` currently hardcodes the hosted zone ID and cert ARN directly (values from `assets/cert-outputs.json`). The context-based approach (`fromContext`) is commented out — consider enabling it for portability.
- `src/app-stack/lib/cloudfront.ts.ignore` and `route53hostedzone.ts.ignore` are disabled construct files (renamed to `.ignore`).
- The `Backend` construct exists but is not used in `SconiStack` — it's available for adding API Gateway backends to any site.
- S3 buckets have `RemovalPolicy.DESTROY` + `autoDeleteObjects: true` — they are deleted when the stack is torn down.
