---
layout: home

hero:
  name: genesis-cdk
  text: AWS CDK constructs for static sites and APIs
  tagline: Deploy CloudFront-fronted S3 sites and Lambda-backed API Gateways with one construct.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/

features:
  - title: Static sites
    details: Deploy root domains and subdomains backed by S3 + CloudFront with a wildcard ACM certificate and Route53 DNS wired up automatically.
  - title: Lambda backend
    details: Attach a Lambda-backed API Gateway to any CloudFront distribution. Origin secret verification keeps your API endpoint private.
  - title: GitHub Actions CI/CD
    details: Reusable workflows for deploying cert stacks and app stacks. OIDC-based auth — no long-lived AWS credentials needed.
---
